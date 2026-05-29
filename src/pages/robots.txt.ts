export async function GET() {
  const content = `User-agent: *
Allow: /
`;
  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
