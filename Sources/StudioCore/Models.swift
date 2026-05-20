import Foundation

public struct PracticeSentence: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var index: Int
    public var text: String
    public var state: SentenceState

    public init(id: UUID = UUID(), index: Int, text: String, state: SentenceState = .new) {
        self.id = id
        self.index = index
        self.text = text
        self.state = state
    }
}

public enum SentenceState: String, CaseIterable, Sendable {
    case new
    case practiced
    case needsRepeat
    case stable
}

public struct TextDocument: Identifiable, Hashable, Sendable {
    public let id: UUID
    public var title: String
    public var body: String
    public var createdAt: Date
    public var sentences: [PracticeSentence]

    public init(
        id: UUID = UUID(),
        title: String,
        body: String,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.title = title.isEmpty ? "Untitled passage" : title
        self.body = body
        self.createdAt = createdAt
        self.sentences = SentenceChunker.chunk(body)
            .enumerated()
            .map { index, text in PracticeSentence(index: index + 1, text: text) }
    }
}

public struct PracticeFeedback: Equatable, Sendable {
    public var title: String
    public var detail: String
    public var needsRepeat: Bool

    public init(title: String, detail: String, needsRepeat: Bool) {
        self.title = title
        self.detail = detail
        self.needsRepeat = needsRepeat
    }
}
