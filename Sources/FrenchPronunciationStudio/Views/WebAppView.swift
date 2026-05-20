import Foundation
import SwiftUI
import WebKit

struct WebAppView: NSViewRepresentable {
    @ObservedObject var modelManager: KokoroModelManager
    @ObservedObject var speechService: SpeechService

    func makeCoordinator() -> Coordinator {
        Coordinator(modelManager: modelManager, speechService: speechService)
    }

    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
        configuration.userContentController.add(context.coordinator, name: "nativeBridge")
        configuration.userContentController.addUserScript(
            WKUserScript(
                source: Self.bridgeScript,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: false
            )
        )

        let overrideURL = ProcessInfo.processInfo.environment["VOIX_CLAIRE_WEBAPP_URL"]
            .flatMap(URL.init(string:))
        let webRoot = Bundle.main.resourceURL?
            .appending(path: "WebApp", directoryHint: .isDirectory)

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsMagnification = false
        webView.setValue(true, forKey: "drawsBackground")
        context.coordinator.webView = webView

        if let overrideURL {
            webView.load(URLRequest(url: overrideURL))
        } else if let webRoot {
            let indexURL = webRoot.appending(path: "index.html")
            webView.loadFileURL(indexURL, allowingReadAccessTo: webRoot)
        } else if let fallbackURL = URL(string: "http://127.0.0.1:1420/") {
            webView.load(URLRequest(url: fallbackURL))
        }

        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        context.coordinator.modelManager = modelManager
        context.coordinator.speechService = speechService
    }

    static let bridgeScript = """
    (() => {
      if (window.__voixClaireNativeBridgeInstalled) return;
      window.__voixClaireNativeBridgeInstalled = true;

      const pending = new Map();
      let sequence = 1;
      const originalFetch = window.fetch.bind(window);

      function nativeCall(method, payload) {
        return new Promise((resolve, reject) => {
          const id = String(sequence++);
          pending.set(id, { resolve, reject });
          window.webkit.messageHandlers.nativeBridge.postMessage({ id, method, payload });
        });
      }

      window.__voixClaireNativeResolve = (id, ok, payload) => {
        const item = pending.get(String(id));
        if (!item) return;
        pending.delete(String(id));
        ok ? item.resolve(payload) : item.reject(new Error(payload && payload.message ? payload.message : "Native bridge failed"));
      };

      window.nativeModel = {
        getStatus: () => nativeCall("health", {}),
        downloadModel: () => nativeCall("downloadModel", {}),
        speakSystem: (payload) => nativeCall("systemTts", payload),
        generateTts: (payload) => nativeCall("tts", payload)
      };

      const nativeLog = (level, values) => {
        try {
          nativeCall("log", {
            level,
            values: Array.from(values).map((value) => {
              if (value instanceof Error) return value.stack || value.message;
              if (typeof value === "string") return value;
              try { return JSON.stringify(value); } catch (_) { return String(value); }
            })
          });
        } catch (_) {}
      };

      ["log", "warn", "error"].forEach((level) => {
        const original = console[level] ? console[level].bind(console) : console.log.bind(console);
        console[level] = (...values) => {
          nativeLog(level, values);
          original(...values);
        };
      });

      window.addEventListener("error", (event) => {
        nativeLog("error", [event.message || "window error", event.filename || "", event.lineno || 0]);
      });

      window.addEventListener("unhandledrejection", (event) => {
        nativeLog("error", ["unhandled rejection", event.reason]);
      });

      window.fetch = async (input, init = {}) => {
        const request = input instanceof Request ? input : undefined;
        const url = request ? request.url : String(input);
        if (!url.startsWith("http://127.0.0.1:8765")) {
          return originalFetch(input, init);
        }

        const method = (init.method || (request && request.method) || "GET").toUpperCase();
        let body = init.body;
        if (body == null && request) {
          try { body = await request.clone().text(); } catch (_) {}
        }

        const response = await nativeCall("fetch", {
          url,
          method,
          body: typeof body === "string" ? body : body == null ? "" : String(body)
        });

        return new Response(response.body || "", {
          status: response.status || 200,
          headers: response.headers || { "Content-Type": "application/json" }
        });
      };
    })();
    """
}

final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    weak var webView: WKWebView?
    var modelManager: KokoroModelManager
    var speechService: SpeechService

    init(modelManager: KokoroModelManager, speechService: SpeechService) {
        self.modelManager = modelManager
        self.speechService = speechService
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard
            let envelope = message.body as? [String: Any],
            let id = envelope["id"] as? String,
            let method = envelope["method"] as? String
        else {
            return
        }

        Task { @MainActor in
            do {
                let payload = envelope["payload"] as? [String: Any] ?? [:]
                let result = try await handle(method: method, payload: payload)
                resolve(id: id, ok: true, payload: result)
            } catch {
                resolve(id: id, ok: false, payload: ["message": error.localizedDescription])
            }
        }
    }

    @MainActor
    private func handle(method: String, payload: [String: Any]) async throws -> [String: Any] {
        switch method {
        case "log":
            nativeLog(payload)
            return [:]
        case "fetch":
            return try await handleFetch(payload)
        case "health":
            return healthResponse()
        case "downloadModel":
            modelManager.downloadModel()
            return healthResponse(modelLoaded: false, status: "downloading")
        case "systemTts":
            return try await systemTtsResponse(payload)
        case "tts":
            return try await ttsResponse(payload)
        default:
            throw NativeBridgeError.unsupportedMethod(method)
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("VoixClaire WebView finished: \(webView.url?.absoluteString ?? "<unknown>")")
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        print("VoixClaire WebView provisional navigation failed: \(error.localizedDescription)")
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("VoixClaire WebView navigation failed: \(error.localizedDescription)")
    }

    private func nativeLog(_ payload: [String: Any]) {
        let level = payload["level"] as? String ?? "log"
        let values = payload["values"] as? [Any] ?? []
        let message = values.map { String(describing: $0) }.joined(separator: " ")
        print("VoixClaire JS \(level): \(message)")
    }

    @MainActor
    private func handleFetch(_ payload: [String: Any]) async throws -> [String: Any] {
        let url = payload["url"] as? String ?? ""
        let method = (payload["method"] as? String ?? "GET").uppercased()
        let body = payload["body"] as? String ?? ""

        if url.hasSuffix("/health") {
            return jsonFetchResponse(healthResponse())
        }

        if url.hasSuffix("/models/kokoro/download"), method == "POST" {
            modelManager.downloadModel()
            return jsonFetchResponse(healthResponse(modelLoaded: false, status: "downloading"))
        }

        if url.hasSuffix("/tts"), method == "POST" {
            let data = Data(body.utf8)
            let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
            return jsonFetchResponse(try await ttsResponse(object))
        }

        return jsonFetchResponse(["error": "not found"], status: 404)
    }

    @MainActor
    private func healthResponse(
        modelLoaded: Bool? = nil,
        status explicitStatus: String? = nil
    ) -> [String: Any] {
        let ready = modelLoaded ?? true
        let installed = modelManager.phase == .ready
        let status: String
        if let explicitStatus {
            status = explicitStatus
        } else {
            switch modelManager.phase {
            case .ready:
                status = "ready"
            case .failed:
                status = "error"
            case .downloading:
                status = "downloading"
            default:
                status = "missing"
            }
        }
        return [
            "backend": "swift-native",
            "model": "sherpa-onnx-kokoro-int8",
            "status": status,
            "device": "macos-native-cpu",
            "runtime": "WKWebView+Swift",
            "modelLoaded": ready && installed,
            "modelInstalled": installed,
            "downloadEndpoint": "/models/kokoro/download",
            "voices": modelManager.voices,
            "defaultModelId": installed ? "kokoro" : "system",
            "models": [
                modelStatus(
                    id: "system",
                    name: "macOS Speech",
                    shortName: "macOS",
                    size: "built-in",
                    status: "ready",
                    progress: 100,
                    voices: speechService.voiceOptions
                ),
                modelStatus(
                    id: "kokoro",
                    name: "Kokoro via Sherpa-ONNX",
                    shortName: "Kokoro",
                    size: "~158 MB",
                    status: status,
                    progress: Int(round(modelManager.progress * 100)),
                    statusMessage: status == "ready" ? nil : modelManager.statusDetail,
                    voices: modelManager.voices
                )
            ]
        ]
    }

    @MainActor
    private func modelStatus(
        id: String,
        name: String,
        shortName: String,
        size: String,
        status: String,
        progress: Int,
        statusMessage: String? = nil,
        voices: [[String: String]]
    ) -> [String: Any] {
        var payload: [String: Any] = [
            "id": id,
            "name": name,
            "shortName": shortName,
            "size": size,
            "status": status,
            "progress": progress,
            "voices": voices.isEmpty ? [["id": "default", "label": "Default"]] : voices,
            "emotions": [["id": "default", "label": "Default"]]
        ]
        if let statusMessage {
            payload["statusMessage"] = statusMessage
        }
        return payload
    }

    @MainActor
    private func systemTtsResponse(_ payload: [String: Any]) async throws -> [String: Any] {
        let text = payload["text"] as? String ?? ""
        let voice = payload["voice"] as? [String: Any] ?? [:]
        let speed = doubleValue(voice["speed"]) ?? 1.0
        let voiceID = voice["voiceId"] as? String
        let generated = try await speechService.synthesize(
            text,
            rate: speed,
            voiceIdentifier: voiceID
        )
        let wav = try Data(contentsOf: generated.audioURL)
        return [
            "audioPath": generated.audioURL.path,
            "audioUrl": "data:audio/wav;base64,\(wav.base64EncodedString())",
            "durationMs": generated.durationMs,
            "sampleRate": generated.sampleRate
        ]
    }

    private func ttsResponse(_ payload: [String: Any]) async throws -> [String: Any] {
        let sentenceID = payload["sentenceId"] as? String ?? "sentence"
        let text = payload["text"] as? String ?? ""
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw NativeBridgeError.invalidRequest("text is required")
        }
        let voice = payload["voice"] as? [String: Any] ?? [:]
        let engine = voice["engine"] as? String ?? "kokoro"
        if engine == "system" {
            return try await systemTtsResponse(payload)
        }

        let voiceID = voice["voiceId"] as? String ?? "ff_siwis"
        let speed = doubleValue(voice["speed"]) ?? 1.0
        let generated = try await modelManager.synthesize(
            sentenceID: sentenceID,
            text: text,
            voiceID: voiceID,
            speed: speed
        )
        let wav = try Data(contentsOf: generated.audioURL)
        return [
            "audioPath": generated.audioURL.path,
            "audioUrl": "data:audio/wav;base64,\(wav.base64EncodedString())",
            "durationMs": generated.durationMs,
            "sampleRate": generated.sampleRate
        ]
    }

    private func doubleValue(_ value: Any?) -> Double? {
        if let number = value as? NSNumber {
            return number.doubleValue
        }
        if let double = value as? Double {
            return double
        }
        if let string = value as? String {
            return Double(string)
        }
        return nil
    }

    private func jsonFetchResponse(_ object: [String: Any], status: Int = 200) -> [String: Any] {
        let data = (try? JSONSerialization.data(withJSONObject: object)) ?? Data("{}".utf8)
        return [
            "status": status,
            "headers": ["Content-Type": "application/json"],
            "body": String(data: data, encoding: .utf8) ?? "{}"
        ]
    }

    private func resolve(id: String, ok: Bool, payload: [String: Any]) {
        guard
            let data = try? JSONSerialization.data(withJSONObject: payload, options: [.fragmentsAllowed]),
            let json = String(data: data, encoding: .utf8)
        else {
            return
        }
        webView?.evaluateJavaScript("window.__voixClaireNativeResolve(\(Self.quoted(id)), \(ok ? "true" : "false"), \(json));")
    }

    private static func quoted(_ value: String) -> String {
        let data = (try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed])) ?? Data("\"\"".utf8)
        return String(data: data, encoding: .utf8) ?? "\"\""
    }
}

enum NativeBridgeError: LocalizedError {
    case unsupportedMethod(String)
    case invalidRequest(String)

    var errorDescription: String? {
        switch self {
        case .unsupportedMethod(let method): "Unsupported native bridge method: \(method)"
        case .invalidRequest(let message): message
        }
    }
}
