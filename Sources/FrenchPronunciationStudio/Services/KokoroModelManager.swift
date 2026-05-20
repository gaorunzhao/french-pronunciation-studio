import Foundation
import StudioCore

struct GeneratedSpeech {
    let audioURL: URL
    let durationMs: Int
    let sampleRate: Int
}

@MainActor
final class KokoroModelManager: ObservableObject {
    enum Phase: Equatable {
        case checking
        case missing
        case downloading
        case ready
        case failed(String)

        var title: String {
            switch self {
            case .checking: "Checking"
            case .missing: "Not downloaded"
            case .downloading: "Downloading"
            case .ready: "Ready"
            case .failed: "Needs attention"
            }
        }
    }

    @Published private(set) var phase: Phase = .checking
    @Published private(set) var completedCount = 0
    @Published private(set) var currentFile = ""
    @Published private(set) var downloadedBytes: Int64 = 0

    let modelDirectory = AppPaths.kokoroDirectory

    private var runtimeDirectory: URL {
        modelDirectory.appending(path: SherpaKokoroManifest.runtimeDirectoryName, directoryHint: .isDirectory)
    }

    private var kokoroDirectory: URL {
        modelDirectory.appending(path: SherpaKokoroManifest.modelDirectoryName, directoryHint: .isDirectory)
    }

    private var executableURL: URL {
        runtimeDirectory
            .appending(path: "bin", directoryHint: .isDirectory)
            .appending(path: "sherpa-onnx-offline-tts")
    }

    var progress: Double {
        Double(completedCount) / 2.0
    }

    var statusDetail: String {
        switch phase {
        case .checking:
            return "Looking in \(modelDirectory.path)"
        case .missing:
            return "\(completedCount)/2 Kokoro runtime assets available"
        case .downloading:
            return currentFile.isEmpty ? "Preparing download" : currentFile
        case .ready:
            return "Sherpa-ONNX Kokoro int8 files are local"
        case .failed(let message):
            return message
        }
    }

    var voices: [[String: String]] {
        SherpaKokoroManifest.voices.map { ["id": $0.id, "label": $0.label] }
    }

    func refresh() {
        do {
            try AppPaths.ensureDirectories()
            completedCount = completedAssetCount()
            phase = completedCount == 2 ? .ready : .missing
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func downloadModel() {
        guard phase != .downloading else { return }
        phase = .downloading
        currentFile = ""
        downloadedBytes = 0

        Task {
            do {
                try AppPaths.ensureDirectories()
                try await ensureRuntime()
                completedCount = completedAssetCount()
                try await ensureModel()
                completedCount = completedAssetCount()
                phase = .ready
                currentFile = ""
            } catch {
                phase = .failed(error.localizedDescription)
            }
        }
    }

    func ensureReady() async throws {
        if phase == .ready { return }
        if completedAssetCount() == 2 {
            phase = .ready
            return
        }
        downloadModel()
        while phase == .downloading {
            try await Task.sleep(for: .milliseconds(250))
        }
        if phase != .ready {
            throw KokoroRuntimeError.modelUnavailable(statusDetail)
        }
    }

    func synthesize(sentenceID: String, text: String, voiceID: String, speed: Double) async throws -> GeneratedSpeech {
        try await ensureReady()
        try AppPaths.ensureDirectories()

        let safeID = Self.safeFilename(sentenceID.isEmpty ? "sentence" : sentenceID)
        let outputURL = AppPaths.generatedAudioDirectory
            .appending(path: "\(safeID)-\(Self.cacheDigest(text: text, voiceID: voiceID, speed: speed)).wav")

        if FileManager.default.fileExists(atPath: outputURL.path),
           let info = try? WavInfo.read(from: outputURL) {
            return GeneratedSpeech(audioURL: outputURL, durationMs: info.durationMs, sampleRate: info.sampleRate)
        }

        let lengthScale = min(max(1.0 / max(speed, 0.1), 0.65), 1.45)
        let arguments = [
            "--debug=0",
            "--provider=cpu",
            "--num-threads=2",
            "--tts-max-num-sentences=1",
            "--kokoro-model=\(kokoroModelURL.path)",
            "--kokoro-voices=\(kokoroDirectory.appending(path: "voices.bin").path)",
            "--kokoro-tokens=\(kokoroDirectory.appending(path: "tokens.txt").path)",
            "--kokoro-data-dir=\(kokoroDirectory.appending(path: "espeak-ng-data", directoryHint: .isDirectory).path)",
            "--kokoro-lang=fr",
            "--kokoro-length-scale=\(String(format: "%.3f", lengthScale))",
            "--sid=\(SherpaKokoroManifest.speakerID(for: voiceID))",
            "--output-filename=\(outputURL.path)",
            normalizeText(text)
        ]

        try await Self.runProcess(executableURL: executableURL, arguments: arguments)
        let info = try WavInfo.read(from: outputURL)
        return GeneratedSpeech(audioURL: outputURL, durationMs: info.durationMs, sampleRate: info.sampleRate)
    }

    private func ensureRuntime() async throws {
        guard !FileManager.default.fileExists(atPath: executableURL.path) else {
            completedCount = completedAssetCount()
            return
        }

        currentFile = SherpaKokoroManifest.runtimeArchiveName
        let archiveURL = modelDirectory.appending(path: SherpaKokoroManifest.runtimeArchiveName)
        try await download(SherpaKokoroManifest.runtimeRemoteURL, to: archiveURL)
        try await Self.extractTarBz2(archiveURL, into: modelDirectory)
        try? FileManager.default.removeItem(at: archiveURL)
        try await Self.runProcess(executableURL: URL(filePath: "/bin/chmod"), arguments: ["+x", executableURL.path])
        downloadedBytes += 25_914_829
    }

    private func ensureModel() async throws {
        let voicesURL = kokoroDirectory.appending(path: "voices.bin")
        guard FileManager.default.fileExists(atPath: kokoroModelURL.path),
              FileManager.default.fileExists(atPath: voicesURL.path) else {
            currentFile = SherpaKokoroManifest.modelArchiveName
            let archiveURL = modelDirectory.appending(path: SherpaKokoroManifest.modelArchiveName)
            try await download(SherpaKokoroManifest.modelRemoteURL, to: archiveURL)
            try await Self.extractTarBz2(archiveURL, into: modelDirectory)
            try? FileManager.default.removeItem(at: archiveURL)
            downloadedBytes += 131_839_838
            return
        }
        completedCount = completedAssetCount()
    }

    private func download(_ remoteURL: URL, to destination: URL) async throws {
        if FileManager.default.fileExists(atPath: destination.path) {
            try FileManager.default.removeItem(at: destination)
        }
        let (temporaryURL, _) = try await URLSession.shared.download(from: remoteURL)
        try FileManager.default.moveItem(at: temporaryURL, to: destination)
    }

    private func completedAssetCount() -> Int {
        var count = 0
        if FileManager.default.fileExists(atPath: executableURL.path) {
            count += 1
        }
        if FileManager.default.fileExists(atPath: kokoroModelURL.path),
           FileManager.default.fileExists(atPath: kokoroDirectory.appending(path: "voices.bin").path),
           FileManager.default.fileExists(atPath: kokoroDirectory.appending(path: "tokens.txt").path) {
            count += 1
        }
        return count
    }

    private var kokoroModelURL: URL {
        let int8URL = kokoroDirectory.appending(path: "model.int8.onnx")
        if FileManager.default.fileExists(atPath: int8URL.path) {
            return int8URL
        }
        return kokoroDirectory.appending(path: "model.onnx")
    }

    private func normalizeText(_ text: String) -> String {
        let normalized = text.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        guard let last = normalized.last else { return normalized }
        return ".!?…".contains(last) ? normalized : "\(normalized)."
    }

    private static func extractTarBz2(_ archiveURL: URL, into directory: URL) async throws {
        try await runProcess(
            executableURL: URL(filePath: "/usr/bin/tar"),
            arguments: ["xjf", archiveURL.path, "-C", directory.path]
        )
    }

    private static func runProcess(executableURL: URL, arguments: [String]) async throws {
        try await withCheckedThrowingContinuation { continuation in
            let process = Process()
            let stderr = Pipe()
            process.executableURL = executableURL
            process.arguments = arguments
            process.standardError = stderr
            process.terminationHandler = { process in
                if process.terminationStatus == 0 {
                    continuation.resume()
                } else {
                    let data = stderr.fileHandleForReading.readDataToEndOfFile()
                    let message = String(data: data, encoding: .utf8) ?? "Process failed"
                    continuation.resume(throwing: KokoroRuntimeError.processFailed(message))
                }
            }

            do {
                try process.run()
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }

    private static func safeFilename(_ value: String) -> String {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_"))
        let scalars = value.unicodeScalars.map { allowed.contains($0) ? Character($0) : "-" }
        let safe = String(scalars).trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return safe.isEmpty ? "sentence" : safe
    }

    private static func cacheDigest(text: String, voiceID: String, speed: Double) -> String {
        let key = "\(text)|\(voiceID)|\(String(format: "%.2f", speed))"
        return String(key.hashValue.magnitude, radix: 16)
    }
}

enum KokoroRuntimeError: LocalizedError {
    case modelUnavailable(String)
    case processFailed(String)
    case invalidWav

    var errorDescription: String? {
        switch self {
        case .modelUnavailable(let message): message
        case .processFailed(let message): message
        case .invalidWav: "Generated WAV file could not be read."
        }
    }
}

private struct WavInfo {
    let durationMs: Int
    let sampleRate: Int

    static func read(from url: URL) throws -> WavInfo {
        let data = try Data(contentsOf: url)
        guard data.count >= 44 else { throw KokoroRuntimeError.invalidWav }

        let sampleRate = Int(data.uint32LittleEndian(at: 24))
        let dataSize = Int(data.uint32LittleEndian(at: 40))
        let channels = max(1, Int(data.uint16LittleEndian(at: 22)))
        let bitsPerSample = max(1, Int(data.uint16LittleEndian(at: 34)))
        let bytesPerSample = max(1, channels * bitsPerSample / 8)
        let sampleCount = dataSize / bytesPerSample
        let durationMs = sampleRate > 0 ? Int(round(Double(sampleCount) / Double(sampleRate) * 1000)) : 0
        return WavInfo(durationMs: durationMs, sampleRate: sampleRate)
    }
}

private extension Data {
    func uint16LittleEndian(at offset: Int) -> UInt16 {
        guard offset + 2 <= count else { return 0 }
        return self[offset..<offset + 2].enumerated().reduce(UInt16(0)) { value, item in
            value | (UInt16(item.element) << UInt16(item.offset * 8))
        }
    }

    func uint32LittleEndian(at offset: Int) -> UInt32 {
        guard offset + 4 <= count else { return 0 }
        return self[offset..<offset + 4].enumerated().reduce(UInt32(0)) { value, item in
            value | (UInt32(item.element) << UInt32(item.offset * 8))
        }
    }
}
