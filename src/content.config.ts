import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const cnaeSchema = z.object({
  // Identity
  codigo: z.string(),
  codigo_slug: z.string(),
  codigo_numerico: z.string(),

  // Description
  descricao_oficial: z.string(),
  descricao_plana: z.string(),

  // Hierarchy
  secao: z.object({
    letra: z.string().length(1),
    slug: z.string(),
    nome: z.string(),
    nome_curto: z.string(),
  }),
  divisao: z.object({
    codigo: z.string(),
    nome: z.string(),
  }),
  grupo: z.object({
    codigo: z.string(),
    nome: z.string(),
  }),
  classe: z.object({
    codigo: z.string(),
    nome: z.string(),
  }),

  // Tax & legal classification
  mei: z.object({
    permitido: z.boolean(),
    observacao: z.string().optional(),
    fonte: z.string(),
    consultado_em: z.string().optional(),
    ocupacao_oficial: z.string().optional(),
    conflito_pendente: z.boolean().default(false),
  }),
  simples_nacional: z.object({
    anexo: z.enum(['I', 'II', 'III', 'IV', 'V', 'nao_aplicavel']),
    observacao: z.string().optional(),
  }),
  natureza_juridica_recomendada: z.array(
    z.enum(['mei', 'me', 'epp', 'ltda', 'sa', 'eireli', 'slu'])
  ),

  // Plain-language enrichment
  exemplos_negocios: z.array(z.string()),
  o_que_inclui: z.array(z.string()),
  o_que_nao_inclui: z.array(z.string()),
  licencas_comuns: z.array(z.string()),

  // Related codes
  cnaes_relacionados: z.array(z.string()),

  // Meta
  enriched: z.boolean().default(false),
  enriched_at: z.string().optional(),
  last_reviewed: z.string(),
  data_year: z.number(),
  notes_internal: z.string().optional(),
});

export const collections = {
  cnae: defineCollection({
    loader: glob({ pattern: '**/*.yaml', base: './src/content/cnae' }),
    schema: cnaeSchema,
  }),
};

export type CnaeEntry = z.infer<typeof cnaeSchema>;
