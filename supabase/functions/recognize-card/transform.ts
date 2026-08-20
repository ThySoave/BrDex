export interface CardRecognition {
  name: string | null;
  number: string | null;
}

function asField(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function parseRecognition(text: string): CardRecognition {
  const match = text.match(/\{[^{}]*\}/);
  if (!match) {
    return { name: null, number: null };
  }

  try {
    const parsed = JSON.parse(match[0]);
    return { name: asField(parsed.name), number: asField(parsed.number) };
  } catch {
    return { name: null, number: null };
  }
}
