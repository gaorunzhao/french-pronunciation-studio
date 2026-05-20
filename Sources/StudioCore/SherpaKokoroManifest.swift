import Foundation

public struct SherpaKokoroVoice: Identifiable, Hashable, Sendable {
    public let id: String
    public let label: String
    public let speakerID: Int

    public init(id: String, label: String, speakerID: Int) {
        self.id = id
        self.label = label
        self.speakerID = speakerID
    }
}

public enum SherpaKokoroManifest {
    public static let repository = "k2-fsa/sherpa-onnx"
    public static let runtimeVersion = "v1.13.2"
    public static let runtimeArchiveName = "sherpa-onnx-v1.13.2-osx-arm64-shared.tar.bz2"
    public static let runtimeDirectoryName = "sherpa-onnx-v1.13.2-osx-arm64-shared"
    public static let modelArchiveName = "kokoro-int8-multi-lang-v1_0.tar.bz2"
    public static let modelDirectoryName = "kokoro-int8-multi-lang-v1_0"

    public static let runtimeRemoteURL = URL(
        string: "https://github.com/k2-fsa/sherpa-onnx/releases/download/\(runtimeVersion)/\(runtimeArchiveName)"
    )!

    public static let modelRemoteURL = URL(
        string: "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/\(modelArchiveName)"
    )!

    public static let approximateTotalBytes: Int64 = 25_914_829 + 131_839_838

    public static let voices: [SherpaKokoroVoice] = [
        SherpaKokoroVoice(id: "default", label: "Siwis French", speakerID: 30),
        SherpaKokoroVoice(id: "af_heart", label: "Heart", speakerID: 3),
        SherpaKokoroVoice(id: "af_bella", label: "Bella", speakerID: 2),
        SherpaKokoroVoice(id: "af_nicole", label: "Nicole", speakerID: 6),
        SherpaKokoroVoice(id: "bf_emma", label: "Emma", speakerID: 21),
        SherpaKokoroVoice(id: "bm_fable", label: "Fable", speakerID: 25)
    ]

    public static func speakerID(for voiceID: String) -> Int {
        voices.first { $0.id == voiceID }?.speakerID ?? voices[0].speakerID
    }
}
