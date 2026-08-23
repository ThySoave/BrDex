export type ReportReason = "golpe" | "ofensa" | "spam" | "perfil_falso" | "outro";

// Lista fixa (mesmo racional da escala de conservação: padronizar o dado, sem texto livre).
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "golpe", label: "Golpe ou fraude" },
  { value: "ofensa", label: "Comportamento ofensivo" },
  { value: "spam", label: "Spam ou propaganda" },
  { value: "perfil_falso", label: "Perfil falso" },
  { value: "outro", label: "Outro" }
];
