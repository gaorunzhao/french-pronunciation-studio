import Foundation

struct SystemSpeechVoice: Hashable {
    let identifier: String
    let name: String
    let language: String
}

@MainActor
final class SpeechService: ObservableObject {
    @Published private(set) var isSpeaking = false
    @Published private(set) var availableFrenchVoices: [SystemSpeechVoice] = []
    @Published var selectedVoiceIdentifier: String?

    private var speechProcess: Process?

    init() {
        refreshVoices()
    }

    func refreshVoices() {
        availableFrenchVoices = Self.loadFrenchVoices()
        selectedVoiceIdentifier = selectedVoiceIdentifier ?? preferredDefaultVoice?.identifier
    }

    var voiceOptions: [[String: String]] {
        let installedVoices = availableFrenchVoices.map { voice in
            ["id": voice.identifier, "label": voice.name]
        }
        return [["id": "default", "label": "System default"]] + installedVoices
    }

    func speak(_ text: String, rate: Double, voiceIdentifier overrideVoiceIdentifier: String? = nil) {
        let spokenText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !spokenText.isEmpty else { return }

        stop()

        let voice = selectedVoice(for: overrideVoiceIdentifier)
        let process = Process()
        process.executableURL = URL(filePath: "/usr/bin/say")
        process.arguments = [
            "-v",
            voice.name,
            "-r",
            String(Int(Self.wordsPerMinute(for: rate))),
            spokenText
        ]
        process.terminationHandler = { [weak self, weak process] _ in
            Task { @MainActor in
                guard self?.speechProcess === process else { return }
                self?.speechProcess = nil
                self?.isSpeaking = false
            }
        }

        do {
            speechProcess = process
            isSpeaking = true
            try process.run()
        } catch {
            speechProcess = nil
            isSpeaking = false
            print("VoixClaire system speech failed: \(error.localizedDescription)")
        }
    }

    func synthesize(
        _ text: String,
        rate: Double,
        voiceIdentifier overrideVoiceIdentifier: String? = nil
    ) async throws -> GeneratedSpeech {
        let spokenText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !spokenText.isEmpty else {
            throw SystemSpeechError.invalidRequest("text is required")
        }

        stop()
        try AppPaths.ensureDirectories()

        let voice = selectedVoice(for: overrideVoiceIdentifier)
        let digest = Self.cacheDigest(
            text: spokenText,
            voiceID: voice.identifier,
            rate: rate
        )
        let outputURL = AppPaths.generatedAudioDirectory
            .appending(path: "system-\(Self.safeFilename(voice.identifier))-\(digest).wav")

        if FileManager.default.fileExists(atPath: outputURL.path),
           let info = try? SystemWavInfo.read(from: outputURL) {
            return GeneratedSpeech(
                audioURL: outputURL,
                durationMs: info.durationMs,
                sampleRate: info.sampleRate
            )
        }

        let temporaryAIFFURL = AppPaths.generatedAudioDirectory
            .appending(path: "system-\(Self.safeFilename(voice.identifier))-\(digest).aiff")
        try? FileManager.default.removeItem(at: temporaryAIFFURL)
        try? FileManager.default.removeItem(at: outputURL)
        defer {
            try? FileManager.default.removeItem(at: temporaryAIFFURL)
        }

        try await Self.runProcess(
            executableURL: URL(filePath: "/usr/bin/say"),
            arguments: [
                "-v",
                voice.name,
                "-r",
                String(Int(Self.wordsPerMinute(for: rate))),
                "-o",
                temporaryAIFFURL.path,
                spokenText
            ]
        )
        try await Self.runProcess(
            executableURL: URL(filePath: "/usr/bin/afconvert"),
            arguments: [
                "-f",
                "WAVE",
                "-d",
                "LEI16",
                temporaryAIFFURL.path,
                outputURL.path
            ]
        )

        let info = try SystemWavInfo.read(from: outputURL)
        return GeneratedSpeech(
            audioURL: outputURL,
            durationMs: info.durationMs,
            sampleRate: info.sampleRate
        )
    }

    func stop() {
        if let speechProcess, speechProcess.isRunning {
            speechProcess.terminate()
        }
        speechProcess = nil
        isSpeaking = false
    }

    private func selectedVoice(for overrideVoiceIdentifier: String?) -> SystemSpeechVoice {
        let requestedIdentifier = overrideVoiceIdentifier == "default" ? nil : overrideVoiceIdentifier
        if let requestedIdentifier,
           let voice = availableFrenchVoices.first(where: { $0.identifier == requestedIdentifier }) {
            return voice
        }
        if let selectedVoiceIdentifier,
           let voice = availableFrenchVoices.first(where: { $0.identifier == selectedVoiceIdentifier }) {
            return voice
        }
        return preferredDefaultVoice ?? SystemSpeechVoice(identifier: "Thomas", name: "Thomas", language: "fr_FR")
    }

    private var preferredDefaultVoice: SystemSpeechVoice? {
        availableFrenchVoices.first(where: { $0.language == "fr_FR" })
            ?? availableFrenchVoices.first
    }

    private static func wordsPerMinute(for rate: Double) -> Double {
        min(max(175.0 * rate, 90.0), 300.0)
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
                    continuation.resume(throwing: SystemSpeechError.processFailed(message))
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
        return safe.isEmpty ? "voice" : safe
    }

    private static func cacheDigest(text: String, voiceID: String, rate: Double) -> String {
        let key = "\(text)|\(voiceID)|\(String(format: "%.2f", rate))"
        return String(key.hashValue.magnitude, radix: 16)
    }

    private static func loadFrenchVoices() -> [SystemSpeechVoice] {
        let process = Process()
        let output = Pipe()
        process.executableURL = URL(filePath: "/usr/bin/say")
        process.arguments = ["-v", "?"]
        process.standardOutput = output
        process.standardError = Pipe()

        do {
            try process.run()
            process.waitUntilExit()
        } catch {
            return [SystemSpeechVoice(identifier: "Thomas", name: "Thomas", language: "fr_FR")]
        }

        let data = output.fileHandleForReading.readDataToEndOfFile()
        guard let text = String(data: data, encoding: .utf8) else {
            return [SystemSpeechVoice(identifier: "Thomas", name: "Thomas", language: "fr_FR")]
        }

        let voices = text.split(separator: "\n").compactMap { line -> SystemSpeechVoice? in
            let parts = line.split(separator: "#", maxSplits: 1, omittingEmptySubsequences: false)
            guard let voiceAndLanguage = parts.first else { return nil }
            let pattern = #"^(.+?)\s{2,}([a-z]{2}_[A-Z]{2})\s*$"#
            guard let match = voiceAndLanguage.range(of: pattern, options: .regularExpression) else {
                return nil
            }
            let matched = String(voiceAndLanguage[match])
            guard let languageRange = matched.range(of: #"[a-z]{2}_[A-Z]{2}\s*$"#, options: .regularExpression) else {
                return nil
            }
            let language = matched[languageRange].trimmingCharacters(in: .whitespaces)
            guard language.lowercased().hasPrefix("fr") else { return nil }
            let name = matched[..<languageRange.lowerBound].trimmingCharacters(in: .whitespaces)
            guard !name.isEmpty else { return nil }
            return SystemSpeechVoice(identifier: name, name: name, language: language)
        }

        return voices.isEmpty
            ? [SystemSpeechVoice(identifier: "Thomas", name: "Thomas", language: "fr_FR")]
            : voices.sorted { left, right in
                if left.language == "fr_FR", right.language != "fr_FR" { return true }
                if left.language != "fr_FR", right.language == "fr_FR" { return false }
                return left.name < right.name
            }
    }
}

enum SystemSpeechError: LocalizedError {
    case invalidRequest(String)
    case processFailed(String)
    case invalidWav

    var errorDescription: String? {
        switch self {
        case .invalidRequest(let message): message
        case .processFailed(let message): message
        case .invalidWav: "System speech WAV file could not be read."
        }
    }
}

private struct SystemWavInfo {
    let durationMs: Int
    let sampleRate: Int

    static func read(from url: URL) throws -> SystemWavInfo {
        let data = try Data(contentsOf: url)
        guard data.count >= 44 else { throw SystemSpeechError.invalidWav }

        let sampleRate = Int(data.systemUInt32LittleEndian(at: 24))
        let dataSize = Int(data.systemUInt32LittleEndian(at: 40))
        let channels = max(1, Int(data.systemUInt16LittleEndian(at: 22)))
        let bitsPerSample = max(1, Int(data.systemUInt16LittleEndian(at: 34)))
        let bytesPerSample = max(1, channels * bitsPerSample / 8)
        let sampleCount = dataSize / bytesPerSample
        let durationMs = sampleRate > 0
            ? Int(round(Double(sampleCount) / Double(sampleRate) * 1000))
            : 0
        return SystemWavInfo(durationMs: durationMs, sampleRate: sampleRate)
    }
}

private extension Data {
    func systemUInt16LittleEndian(at offset: Int) -> UInt16 {
        guard offset + 2 <= count else { return 0 }
        return self[offset..<offset + 2].enumerated().reduce(UInt16(0)) { value, item in
            value | (UInt16(item.element) << UInt16(item.offset * 8))
        }
    }

    func systemUInt32LittleEndian(at offset: Int) -> UInt32 {
        guard offset + 4 <= count else { return 0 }
        return self[offset..<offset + 4].enumerated().reduce(UInt32(0)) { value, item in
            value | (UInt32(item.element) << UInt32(item.offset * 8))
        }
    }
}
