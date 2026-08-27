export interface UniversityMatch {
  university: string;
  score: number;
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function similarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0;

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
    }
    previous = current;
  }

  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

function candidatePassages(recognizedText: string, wordCount: number): string[] {
  const normalizedLines = recognizedText.split(/\r?\n/).map(normalize).filter(Boolean);
  const words = normalize(recognizedText).split(" ").filter(Boolean);
  const passages = new Set(normalizedLines);

  for (let length = Math.max(1, wordCount - 1); length <= wordCount + 1; length++) {
    for (let start = 0; start + length <= words.length; start++) {
      passages.add(words.slice(start, start + length).join(" "));
    }
  }

  return [...passages];
}

export function findUniversityMatch(
  recognizedText: string,
  universities: readonly string[],
  minimumScore = 0.72
): UniversityMatch | null {
  let best: UniversityMatch | null = null;

  for (const university of universities) {
    const normalizedUniversity = normalize(university);
    if (!normalizedUniversity) continue;

    const passages = candidatePassages(recognizedText, normalizedUniversity.split(" ").length);
    const score = passages.reduce(
      (highest, passage) => Math.max(highest, similarity(normalizedUniversity, passage)),
      0
    );

    if (!best || score > best.score) best = { university, score };
  }

  if (!best || best.score < minimumScore) return null;
  return { ...best, score: Math.round(best.score * 1000) / 1000 };
}