// Run: npm run seo:check — static checks for the public guides (no network).
import { readFileSync } from "node:fs";
import { GUIDES } from "../src/lib/guides.js";

const errors = [];
const slugs = new Set(GUIDES.map((g) => g.slug));
const titles = new Set();
for (const g of GUIDES) {
  const at = `guide/${g.slug}`;
  if (!/^[a-z0-9-]+$/.test(g.slug)) errors.push(`${at}: invalid slug`);
  for (const k of ["title", "question", "description", "answer", "summary"]) if (!g[k]) errors.push(`${at}: missing ${k}`);
  if (g.description && (g.description.length < 70 || g.description.length > 200)) errors.push(`${at}: description length ${g.description.length} (70–200)`);
  if (titles.has(g.title)) errors.push(`${at}: duplicate title`);
  titles.add(g.title);
  if (!g.sections?.length || !g.checklist?.length || !g.faq?.length) errors.push(`${at}: needs sections, checklist and faq`);
  for (const r of g.related || []) if (!slugs.has(r)) errors.push(`${at}: related slug "${r}" does not exist`);
}
const sitemap = readFileSync("supabase/functions/sitemap-xml/index.ts", "utf8");
for (const g of GUIDES) if (!sitemap.includes(`"guide/${g.slug}"`)) errors.push(`sitemap missing guide/${g.slug}`);
if (!/Sitemap:\s*https:\/\/www\.florapro\.ir\/sitemap\.xml/.test(readFileSync("public/robots.txt", "utf8"))) errors.push("robots.txt missing Sitemap line");
if (!/guide/.test(readFileSync("index.html", "utf8"))) errors.push("index.html public-route regex missing /guide");
if (!/\/guide/.test(readFileSync("src/main.jsx", "utf8"))) errors.push("main.jsx public routing missing /guide");

if (errors.length) { console.error("SEO check failed:\n- " + errors.join("\n- ")); process.exit(1); }
console.log(`SEO check passed (${GUIDES.length} guides).`);
