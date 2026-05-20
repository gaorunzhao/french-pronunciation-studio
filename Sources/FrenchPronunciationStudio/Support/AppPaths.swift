import Foundation

enum AppPaths {
    static var applicationSupport: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appending(path: "Voix Claire", directoryHint: .isDirectory)
    }

    static var modelsRoot: URL {
        applicationSupport.appending(path: "models", directoryHint: .isDirectory)
    }

    static var kokoroDirectory: URL {
        modelsRoot.appending(path: "kokoro-sherpa-onnx", directoryHint: .isDirectory)
    }

    static var generatedAudioDirectory: URL {
        modelsRoot.appending(path: "generated-audio", directoryHint: .isDirectory)
    }

    static var recordingsDirectory: URL {
        applicationSupport.appending(path: "recordings", directoryHint: .isDirectory)
    }

    static func ensureDirectories() throws {
        try FileManager.default.createDirectory(at: modelsRoot, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: kokoroDirectory, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: generatedAudioDirectory, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: recordingsDirectory, withIntermediateDirectories: true)
    }
}
