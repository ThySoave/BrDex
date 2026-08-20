import { parseRecognition } from "./transform.ts";

const PROMPT =
  'Esta é a foto de uma carta de Pokémon TCG. Responda APENAS com JSON no formato {"name": "<nome da carta em inglês>", "number": "<número da carta, sem o total do set>"}. Se não conseguir identificar um campo, use null.';

Deno.serve(async (req) => {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(
      "ANTHROPIC_API_KEY não configurada — defina a chave nas secrets da function.",
      { status: 500 }
    );
  }

  let imageBase64: unknown;
  try {
    ({ imageBase64 } = await req.json());
  } catch {
    imageBase64 = undefined;
  }

  if (typeof imageBase64 !== "string" || imageBase64 === "") {
    return new Response("Body inválido: envie { imageBase64 }.", { status: 400 });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-opus-5",
      max_tokens: 2048,
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: imageBase64 }
            },
            { type: "text", text: PROMPT }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    return new Response(`Anthropic API error: ${response.status}`, { status: 502 });
  }

  const body = await response.json();
  const text =
    body.stop_reason === "refusal"
      ? ""
      : (body.content ?? [])
          .filter((block: { type: string }) => block.type === "text")
          .map((block: { text: string }) => block.text)
          .join("\n");

  return new Response(JSON.stringify(parseRecognition(text)), {
    headers: { "Content-Type": "application/json" }
  });
});
