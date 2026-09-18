import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const STATIC_PAGES = ["site", "properties", "about", "contact"];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

Deno.serve(async () => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: rows } = await admin.from("public_properties").select("slug, updated_at").order("updated_at", { ascending: false }).limit(5000);

  const urls: string[] = STATIC_PAGES.map((p) =>
    `  <url><loc>https://www.florapro.ir/${p}</loc><changefreq>weekly</changefreq><priority>${p === "site" ? "1.0" : "0.7"}</priority></url>`
  );
  for (const r of rows || []) {
    urls.push(`  <url><loc>https://www.florapro.ir/properties/${esc(r.slug)}</loc><lastmod>${new Date(r.updated_at).toISOString().slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
});
