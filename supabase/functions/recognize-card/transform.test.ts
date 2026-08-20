import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { parseRecognition } from "./transform.ts";

Deno.test("parseRecognition extracts name and number from plain JSON", () => {
  assertEquals(parseRecognition('{"name": "Charizard", "number": "4"}'), {
    name: "Charizard",
    number: "4"
  });
});

Deno.test("parseRecognition tolerates code fences and surrounding text", () => {
  const text = 'Aqui está o resultado:\n```json\n{"name": "Pikachu", "number": "58"}\n```\nEspero ter ajudado.';
  assertEquals(parseRecognition(text), { name: "Pikachu", number: "58" });
});

Deno.test("parseRecognition maps missing or empty fields to null", () => {
  assertEquals(parseRecognition('{"name": "Mewtwo"}'), { name: "Mewtwo", number: null });
  assertEquals(parseRecognition('{"name": "", "number": ""}'), { name: null, number: null });
  assertEquals(parseRecognition('{"name": 42, "number": ["4"]}'), { name: null, number: null });
});

Deno.test("parseRecognition returns nulls for text without valid JSON", () => {
  assertEquals(parseRecognition("não consegui identificar a carta"), { name: null, number: null });
  assertEquals(parseRecognition(""), { name: null, number: null });
});
