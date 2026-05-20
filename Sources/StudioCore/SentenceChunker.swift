import Foundation

public enum SentenceChunker {
    private static let abbreviations: Set<String> = [
        "M.", "Mme.", "Mlle.", "Dr.", "Pr.", "St.", "Ste.", "etc."
    ]

    public static func chunk(_ input: String) -> [String] {
        let normalized = input
            .replacingOccurrences(of: "\r\n", with: "\n")
            .split(whereSeparator: \.isNewline)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")

        guard !normalized.isEmpty else { return [] }

        var sentences: [String] = []
        var current = ""
        var token = ""

        for character in normalized {
            current.append(character)
            if character.isWhitespace {
                token = ""
            } else {
                token.append(character)
            }

            guard ".!?".contains(character) else { continue }
            let trimmed = current.trimmingCharacters(in: .whitespacesAndNewlines)
            if abbreviations.contains(token) || trimmed.count < 2 {
                continue
            }

            sentences.append(trimmed)
            current = ""
            token = ""
        }

        let remainder = current.trimmingCharacters(in: .whitespacesAndNewlines)
        if !remainder.isEmpty {
            sentences.append(remainder)
        }

        return sentences
    }
}
