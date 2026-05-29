export const config = { runtime: 'edge' };

interface CrawlLogRow {
  id: number;
  path: string;
  link_type: string | null;
  crawled_at: string;
  user_agent: string | null;
  ip: string | null;
  bot_name: string | null;
  verified: boolean | null;
}

export default async function handler(request: Request): Promise<Response> {
  const key = request.headers.get('x-export-key');
  if (!key || key !== process.env.EXPORT_SECRET_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/crawl_logs?select=*&order=crawled_at.asc`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );

  if (!res.ok) {
    return new Response('Failed to fetch data', { status: 500 });
  }

  const rows = (await res.json()) as CrawlLogRow[];

  const header = 'id,path,link_type,crawled_at,bot_name,user_agent,ip,verified\n';
  const csv = rows
    .map((r) =>
      [
        r.id,
        r.path,
        r.link_type ?? '',
        r.crawled_at,
        r.bot_name ?? '',
        `"${(r.user_agent ?? '').replace(/"/g, '""')}"`,
        r.ip ?? '',
        r.verified ?? '',
      ].join(','),
    )
    .join('\n');

  return new Response(header + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="crawl-logs.csv"',
    },
  });
}
