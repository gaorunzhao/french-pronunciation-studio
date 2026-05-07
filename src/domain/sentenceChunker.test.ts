import { chunkFrenchText, mergeSentences, splitSentence } from "./sentenceChunker";

describe("chunkFrenchText", () => {
  it("splits French prose into sentence practice units", () => {
    expect(
      chunkFrenchText("Bonjour. Je voudrais un cafe creme, s'il vous plait. Merci !")
    ).toEqual([
      "Bonjour.",
      "Je voudrais un cafe creme, s'il vous plait.",
      "Merci !"
    ]);
  });

  it("keeps common French abbreviations inside the sentence", () => {
    expect(chunkFrenchText("M. Dupont arrive. Il parle francais.")).toEqual([
      "M. Dupont arrive.",
      "Il parle francais."
    ]);
  });
});

describe("manual sentence editing", () => {
  it("merges adjacent sentences", () => {
    expect(mergeSentences(["Bonjour.", "Comment allez-vous ?", "Tres bien."], 0)).toEqual([
      "Bonjour. Comment allez-vous ?",
      "Tres bien."
    ]);
  });

  it("splits one sentence at a character offset", () => {
    expect(splitSentence(["Bonjour. Comment allez-vous ?"], 0, 8)).toEqual([
      "Bonjour.",
      "Comment allez-vous ?"
    ]);
  });
});
