import { z } from 'zod';

export const enrichmentOutputSchema = z.object({
  descricao_plana: z.string().min(30).max(280),
  exemplos_negocios: z.array(z.string().min(5).max(120)).min(3).max(7),
  o_que_inclui: z.array(z.string().min(10).max(200)).min(3).max(8),
  o_que_nao_inclui: z.array(z.string().min(10).max(250)).min(2).max(7),
  licencas_comuns: z.array(z.string().min(3).max(100)).min(1).max(6),
  cnaes_relacionados: z
    .array(z.string().regex(/^\d{4}-\d\/\d{2}$/))
    .min(3)
    .max(10),
});

export type EnrichmentOutput = z.infer<typeof enrichmentOutputSchema>;
