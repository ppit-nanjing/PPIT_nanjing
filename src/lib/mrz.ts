export interface PassportMrzResult {
  fullName: string;
  surname: string;
  givenNames: string;
  passportNumber: string;
  nationality: string;
  issuingCountry: string;
  birthDate: string;
  gender: "Laki-Laki" | "Perempuan" | "";
  passportExpiry: string;
  correctedFields: string[];
}

const WEIGHTS = [7, 3, 1];
const DIGIT_CONFUSIONS: Record<string, string> = {
  O: "0",
  Q: "0",
  D: "0",
  I: "1",
  L: "1",
  Z: "2",
  S: "5",
  G: "6",
  B: "8",
};
const CHARACTER_CONFUSIONS: Record<string, string> = {
  "0": "O",
  O: "0",
  "1": "I",
  I: "1",
  L: "1",
  "2": "Z",
  Z: "2",
  "5": "S",
  S: "5",
  "6": "G",
  G: "6",
  "8": "B",
  B: "8",
};

function characterValue(character: string): number {
  if (character === "<") return 0;
  if (/\d/.test(character)) return Number(character);
  return (character.codePointAt(0) ?? 55) - 55;
}

function checkDigit(value: string): string {
  const sum = [...value].reduce(
    (total, character, index) => total + characterValue(character) * WEIGHTS[index % WEIGHTS.length],
    0
  );
  return String(sum % 10);
}

function normalizeCheckDigit(value: string): string | null {
  if (/\d/.test(value)) return value;
  if (value === "<") return "0";
  return DIGIT_CONFUSIONS[value] ?? null;
}

function normalizeDigits(value: string): { value: string; corrected: boolean } | null {
  let corrected = false;
  const digits = [...value].map((character) => {
    if (/\d/.test(character)) return character;
    const replacement = DIGIT_CONFUSIONS[character];
    if (!replacement) return null;
    corrected = true;
    return replacement;
  });
  if (digits.includes(null)) return null;
  return { value: digits.join(""), corrected };
}

function collectVariants(candidates: string[], seen: Set<string>): string[] {
  const variants: string[] = [];
  for (const candidate of candidates) {
    for (let index = 0; index < candidate.length; index++) {
      const replacement = CHARACTER_CONFUSIONS[candidate[index]];
      if (!replacement) continue;
      const variant = candidate.slice(0, index) + replacement + candidate.slice(index + 1);
      if (seen.has(variant)) continue;
      seen.add(variant);
      if (seen.size < 512) variants.push(variant);
    }
  }
  return variants;
}

function repairCheckedField(value: string, rawCheck: string) {
  const expected = normalizeCheckDigit(rawCheck);
  if (expected === null) return null;
  if (checkDigit(value) === expected) return { value, corrected: rawCheck !== expected && rawCheck !== "<" };

  let candidates = [value];
  const seen = new Set(candidates);
  for (let changes = 1; changes <= 3; changes++) {
    candidates = collectVariants(candidates, seen);
    const valid = candidates.find((candidate) => checkDigit(candidate) === expected);
    if (valid) return { value: valid, corrected: true };
  }
  return null;
}

function normalizeLetters(value: string) {
  let corrected = false;
  const normalized = [...value]
    .map((character) => {
      if (character === "<" || /[A-Z]/.test(character)) return character;
      const replacement = CHARACTER_CONFUSIONS[character];
      corrected ||= Boolean(replacement);
      return replacement ?? character;
    })
    .join("");
  return { value: normalized, corrected };
}

function mrzDate(value: string, kind: "birth" | "expiry"): string | null {
  const year = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  const currentYear = new Date().getUTCFullYear();
  let fullYear: number;
  if (kind === "birth") {
    const century = year <= currentYear % 100 ? 2000 : 1900;
    fullYear = century + year;
  } else {
    fullYear = [1900 + year, 2000 + year, 2100 + year].sort(
      (left, right) => Math.abs(left - currentYear) - Math.abs(right - currentYear)
    )[0];
  }
  const date = new Date(Date.UTC(fullYear, month - 1, day));
  if (
    date.getUTCFullYear() !== fullYear ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function normalizeRawLine(rawLine: string): string {
  return rawLine
    .toUpperCase()
    .replace(/[«‹]/g, "<")
    .replace(/\s/g, "<")
    .replace(/[^A-Z0-9<]/g, "");
}

function normalizedLineWindows(rawLine: string): string[] {
  const line = normalizeRawLine(rawLine);
  if (line.length < 44) return [];
  return Array.from({ length: line.length - 43 }, (_, index) => line.slice(index, index + 44));
}

function parseLines(line1: string, line2: string): PassportMrzResult | null {
  if (!line1.startsWith("P")) return null;

  const passportNumber = repairCheckedField(line2.slice(0, 9), line2[9]);
  const birth = normalizeDigits(line2.slice(13, 19));
  const birthCheck = normalizeCheckDigit(line2[19]);
  const expiry = normalizeDigits(line2.slice(21, 27));
  const expiryCheck = normalizeCheckDigit(line2[27]);
  const optional = repairCheckedField(line2.slice(28, 42), line2[42]);
  const passportCheck = normalizeCheckDigit(line2[9]);
  const optionalCheck = normalizeCheckDigit(line2[42]);
  const compositeCheck = normalizeCheckDigit(line2[43]);
  if (
    !passportNumber ||
    !passportCheck ||
    !birth ||
    !expiry ||
    !optional ||
    !birthCheck ||
    !expiryCheck ||
    !optionalCheck ||
    !compositeCheck
  ) {
    return null;
  }
  if (checkDigit(birth.value) !== birthCheck || checkDigit(expiry.value) !== expiryCheck) return null;

  const correctedLine2 =
    passportNumber.value +
    passportCheck +
    line2.slice(10, 13) +
    birth.value +
    birthCheck +
    line2[20] +
    expiry.value +
    expiryCheck +
    optional.value +
    optionalCheck;
  const composite = correctedLine2.slice(0, 10) + correctedLine2.slice(13, 20) + correctedLine2.slice(21, 43);
  if (checkDigit(composite) !== compositeCheck) return null;

  const name = normalizeLetters(line1.slice(5));
  const [rawSurname, ...rawGivenNames] = name.value.split("<<");
  const surname = rawSurname.replace(/<+/g, " ").trim();
  const givenNames = rawGivenNames.join(" ").replace(/<+/g, " ").trim();
  const birthDate = mrzDate(birth.value, "birth");
  const passportExpiry = mrzDate(expiry.value, "expiry");
  if (!surname || !birthDate || !passportExpiry) return null;

  const correctedFields = [
    passportNumber.corrected ? "passportNumber" : null,
    birth.corrected || line2.slice(13, 19) !== birth.value ? "birthDate" : null,
    expiry.corrected || line2.slice(21, 27) !== expiry.value ? "passportExpiry" : null,
    name.corrected ? "fullName" : null,
  ].filter((field): field is string => Boolean(field));
  let gender: PassportMrzResult["gender"] = "";
  if (line2[20] === "M") gender = "Laki-Laki";
  if (line2[20] === "F") gender = "Perempuan";

  const trimmedPassportNumber = passportNumber.value.split("<", 1)[0];

  return {
    fullName: [givenNames, surname].filter(Boolean).join(" "),
    surname,
    givenNames,
    passportNumber: trimmedPassportNumber,
    nationality: normalizeLetters(line2.slice(10, 13)).value.replaceAll("<", ""),
    issuingCountry: normalizeLetters(line1.slice(2, 5)).value.replaceAll("<", ""),
    birthDate,
    gender,
    passportExpiry,
    correctedFields,
  };
}

function parseMergedRows(rawLines: string[]): PassportMrzResult | null {
  for (const rawLine of rawLines) {
    const merged = normalizeRawLine(rawLine);
    for (let offset = 0; offset + 88 <= merged.length; offset++) {
      const parsed = parseLines(merged.slice(offset, offset + 44), merged.slice(offset + 44, offset + 88));
      if (parsed) return parsed;
    }
  }
  return null;
}

function parseSeparateRows(rawLines: string[]): PassportMrzResult | null {
  const rows = rawLines.map(normalizedLineWindows).filter((row) => row.length > 0);
  for (let firstIndex = 0; firstIndex < rows.length; firstIndex++) {
    for (const line1 of rows[firstIndex]) {
      for (let secondIndex = firstIndex + 1; secondIndex < Math.min(rows.length, firstIndex + 3); secondIndex++) {
        for (const line2 of rows[secondIndex]) {
          const parsed = parseLines(line1, line2);
          if (parsed) return parsed;
        }
      }
    }
  }
  return null;
}

export function parsePassportMrz(recognizedText: string): PassportMrzResult | null {
  const rawLines = recognizedText.split(/\r?\n/);
  return parseMergedRows(rawLines) ?? parseSeparateRows(rawLines);
}