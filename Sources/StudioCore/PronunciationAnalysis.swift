import Foundation

public enum PronunciationAnalysis {
    public static func feedback(for sentence: PracticeSentence, recordingDuration: TimeInterval?) -> PracticeFeedback {
        let wordCount = sentence.text
            .split { !$0.isLetter && !$0.isNumber && $0 != "'" }
            .count
        let expectedDuration = max(1.2, Double(wordCount) * 0.42)

        guard let recordingDuration, recordingDuration > 0 else {
            return PracticeFeedback(
                title: "Ready to compare",
                detail: "Record the line, then compare timing and pacing.",
                needsRepeat: false
            )
        }

        let ratio = recordingDuration / expectedDuration
        if ratio < 0.72 {
            return PracticeFeedback(
                title: "A little fast",
                detail: "Try letting final syllables land more clearly.",
                needsRepeat: true
            )
        }

        if ratio > 1.42 {
            return PracticeFeedback(
                title: "A little slow",
                detail: "Keep the phrase connected while preserving the vowels.",
                needsRepeat: true
            )
        }

        return PracticeFeedback(
            title: "Good pacing",
            detail: "Timing is close to the reference. Focus on liaison and vowel shape.",
            needsRepeat: false
        )
    }
}
