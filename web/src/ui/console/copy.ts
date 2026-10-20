export const CONSOLE_COPY = {
  placeholder: "escribe lo que sientes… p. ej. «me pesa el pecho»",
  keys: "enter: enviar · esc: desconectar",
  objective: (objective: string) => `RITO GUIADO: ${objective}`,
  archived: (fragment: string) => `// frase archivada: «${fragment}» — los glifos la usarán.`,
  echo: (input: string) => `> ${input}`,
  pressure: (pressure: number, stance: string | undefined) =>
    `presión ${Math.round(pressure * 100)}%${stance ? ` · ${stance}` : ""}`,
} as const;
