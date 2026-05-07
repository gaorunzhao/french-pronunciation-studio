const ABBREVIATIONS = new Set(["M.", "Mme.", "Mlle.", "Dr.", "Pr."]);

export function chunkFrenchText(input: string): string[] {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences: string[] = [];
  let start = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (![".", "!", "?"].includes(char)) continue;

    const candidate = normalized.slice(start, index + 1).trim();
    const lastToken = candidate.split(" ").at(-1);
    if (lastToken && ABBREVIATIONS.has(lastToken)) continue;

    const next = normalized[index + 1];
    if (next && next !== " ") continue;

    sentences.push(candidate);
    start = index + 1;
  }

  const remainder = normalized.slice(start).trim();
  if (remainder) sentences.push(remainder);

  return sentences;
}

export function mergeSentences(sentences: string[], index: number): string[] {
  if (index < 0 || index >= sentences.length - 1) return sentences;
  return [
    ...sentences.slice(0, index),
    `${sentences[index]} ${sentences[index + 1]}`.trim(),
    ...sentences.slice(index + 2)
  ];
}

export function splitSentence(sentences: string[], index: number, offset: number): string[] {
  const sentence = sentences[index];
  if (!sentence || offset <= 0 || offset >= sentence.length) return sentences;

  const left = sentence.slice(0, offset).trim();
  const right = sentence.slice(offset).trim();
  if (!left || !right) return sentences;

  return [...sentences.slice(0, index), left, right, ...sentences.slice(index + 1)];
}
