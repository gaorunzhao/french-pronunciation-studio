import Foundation
import StudioCore

func expect(_ condition: @autoclosure () -> Bool, _ message: String) {
    if !condition() {
        FileHandle.standardError.write(Data("Check failed: \(message)\n".utf8))
        exit(1)
    }
}

let chunks = SentenceChunker.chunk("Bonjour. Je voudrais un cafe creme, s'il vous plait. Merci !")
expect(
    chunks == ["Bonjour.", "Je voudrais un cafe creme, s'il vous plait.", "Merci !"],
    "French text should split into sentence practice units"
)

let abbreviationChunks = SentenceChunker.chunk("M. Dupont arrive. Il parle francais.")
expect(
    abbreviationChunks == ["M. Dupont arrive.", "Il parle francais."],
    "French abbreviation should stay inside sentence"
)

let sentence = PracticeSentence(index: 1, text: "Bonjour tout le monde.")
let goodFeedback = PronunciationAnalysis.feedback(for: sentence, recordingDuration: 1.7)
expect(!goodFeedback.needsRepeat, "Close timing should not require repeat")
expect(goodFeedback.title == "Good pacing", "Close timing should report good pacing")

let fastFeedback = PronunciationAnalysis.feedback(for: sentence, recordingDuration: 0.5)
expect(fastFeedback.needsRepeat, "Very fast timing should require repeat")

print("StudioCore checks passed")
