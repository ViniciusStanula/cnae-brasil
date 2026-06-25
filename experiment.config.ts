// Phase 1 split (2026-05-30 to 2026-06-25): 11 HTML control, 10 JS treatment.
// Phase 2 (2026-06-25+): all seções converted to HTML to measure recovery.

export const HTML_SECOES = [
  'agricultura',                   // A
  'industrias-extrativas',         // B — was JS
  'industrias-de-transformacao',   // C
  'eletricidade-gas-agua',         // D — was JS
  'agua-esgoto-residuos',          // E
  'construcao',                    // F — was JS
  'comercio',                      // G
  'transporte',                    // H — was JS
  'alojamento-alimentacao',        // I
  'informacao-comunicacao',        // J — was JS
  'financeiro-seguros',            // K
  'atividades-imobiliarias',       // L — was JS
  'atividades-profissionais',      // M
  'atividades-administrativas',    // N — was JS
  'administracao-publica',         // O
  'educacao',                      // P — was JS
  'saude-servicos-sociais',        // Q
  'artes-cultura-esporte',         // R — was JS
  'outras-atividades-de-servicos', // S
  'servicos-domesticos',           // T — was JS
  'organismos-internacionais',     // U
];

export const JS_SECOES: string[] = [];
