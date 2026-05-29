export interface EnrichmentInput {
  codigo: string;
  descricao_oficial: string;
  secao: { letra: string; nome: string };
  divisao: { codigo: string; nome: string };
  grupo: { codigo: string; nome: string };
  classe: { codigo: string; nome: string };
  mei: { permitido: boolean; ocupacao_oficial?: string };
  simples_nacional: { anexo: string };
  siblings: Array<{ codigo: string; descricao_oficial: string }>;
}

const SYSTEM_PROMPT = `Você é um especialista em CNAE e legislação tributária brasileira, escrevendo conteúdo de referência para empreendedores em linguagem clara e direta.

O leitor é um brasileiro abrindo ou consultando um negócio. Pode ser MEI, pode ser contador, pode estar com dúvida sobre qual código usar.

REGRAS DE ESTILO (obrigatórias):
- Escreva em português do Brasil, nunca em português de Portugal
- Use "você" de forma informal
- Sem travessões (—) nem estruturas "não X, mas Y"
- Nunca use a palavra "navegar" em qualquer contexto
- Use números e fatos concretos em vez de linguagem vaga
- Tom prático e direto, como um contador conhecido explicando algo a um cliente
- NUNCA invente valores monetários específicos (capital social, faturamento mínimo, etc.) que não estejam nos dados fornecidos
- NUNCA invente nomes de licenças, alvarás ou órgãos reguladores específicos — use categorias genéricas (alvará sanitário, licença ambiental, alvará municipal de funcionamento, AVCB)
- NUNCA dê conselhos ("você deve...", "é recomendado...") — apenas explique o que é o CNAE

FONTE DA VERDADE:
Tudo que você escrever deve ser derivável da descrição oficial do IBGE e da hierarquia fornecida. Se algo não for claramente derivável, omita ou seja conservador.

FORMATO DE SAÍDA:
Responda APENAS com JSON válido conforme o schema fornecido. Sem comentários, sem texto antes ou depois do JSON, sem markdown fences.`;

export function buildEnrichmentPrompt(input: EnrichmentInput): { system: string; user: string } {
  const meiLine = input.mei.permitido
    ? `true${input.mei.ocupacao_oficial ? ` — Ocupação oficial registrada: "${input.mei.ocupacao_oficial}"` : ''}`
    : `false (este CNAE não é permitido para Microempreendedor Individual)`;

  const simpleLine =
    input.simples_nacional.anexo === 'nao_aplicavel'
      ? 'Não se enquadra no Simples Nacional / não aplicável'
      : `Anexo ${input.simples_nacional.anexo}`;

  const siblingsText =
    input.siblings.length > 0
      ? input.siblings.map((s) => `- ${s.codigo}: ${s.descricao_oficial}`).join('\n')
      : '(nenhum código irmão encontrado na mesma classe)';

  const user = `Gere o conteúdo enriquecido para o seguinte CNAE:

CÓDIGO: ${input.codigo}
DESCRIÇÃO OFICIAL IBGE: ${input.descricao_oficial}

HIERARQUIA:
- Seção ${input.secao.letra}: ${input.secao.nome}
- Divisão ${input.divisao.codigo}: ${input.divisao.nome}
- Grupo ${input.grupo.codigo}: ${input.grupo.nome}
- Classe ${input.classe.codigo}: ${input.classe.nome}

MEI: ${meiLine}
SIMPLES NACIONAL: ${simpleLine}

CNAEs IRMÃOS (mesma classe ou próximos):
${siblingsText}

GERE OS SEGUINTES CAMPOS, EM PORTUGUÊS DO BRASIL:

1. descricao_plana: Frase única explicando o que esta atividade é em linguagem cotidiana. Máximo 220 caracteres. Não copie a descrição oficial — reescreva em linguagem simples.

2. exemplos_negocios: 4-6 exemplos concretos e plausíveis de negócios que se enquadram NESTE CNAE. Devem ser tipos de negócios reais (não nomes de empresas), legalmente compatíveis com a descrição oficial. NÃO inclua exemplos que se enquadrariam melhor em outro CNAE.

3. o_que_inclui: 4-7 bullet points descrevendo atividades CLARAMENTE incluídas neste código. Seja conservador: se não está claro pela descrição oficial, não inclua.

4. o_que_nao_inclui: 3-6 bullet points descrevendo atividades que NÃO se enquadram aqui e devem usar outro código. Para CADA item, indique o código correto entre parênteses, usando os CNAEs irmãos quando aplicável. Exemplo: "Padaria com produção própria (use CNAE 4721-1/01)".

5. licencas_comuns: 2-5 categorias genéricas de licenças tipicamente necessárias. Use apenas categorias amplas (alvará sanitário, licença ambiental, alvará municipal, AVCB, licenças setoriais). NÃO invente nomes específicos.

6. cnaes_relacionados: Lista de 5-10 códigos CNAE relacionados (no formato "9999-9/99"). Use os irmãos fornecidos e adicione outros que sejam genuinamente próximos. NÃO invente códigos que não conheça.

RESPONDA APENAS COM JSON, sem markdown, no formato:
{
  "descricao_plana": "...",
  "exemplos_negocios": ["...", "..."],
  "o_que_inclui": ["...", "..."],
  "o_que_nao_inclui": ["...", "..."],
  "licencas_comuns": ["...", "..."],
  "cnaes_relacionados": ["9999-9/99", "..."]
}`;

  return { system: SYSTEM_PROMPT, user };
}
