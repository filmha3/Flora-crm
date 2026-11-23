import React, { useEffect, useState } from "react";
import { GUIDES, guideBySlug } from "../lib/guides.js";
import { setMeta, pc, OFFICE, SITE, ORG_LD, NavLink, PublicHeader, PublicFooter } from "./PublicSite.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { fmtToman } from "../lib/format.js";

const wrap = { minHeight: "100vh", background: pc.bg, fontFamily: "'Vazirmatn', sans-serif", color: pc.ink };
const body = { maxWidth: 760, margin: "0 auto", padding: "56px 20px" };
const crumb = (items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + path })) });

function PublicGuidesIndexView({ navigate }) {
  useEffect(() => {
    setMeta(`راهنمای خرید ملک در سرعین — ${OFFICE.name}`, "راهنماهای کاربردی خرید آپارتمان، پیش‌فروش، مدارک و سرمایه‌گذاری ملکی در سرعین.", {
      path: "/guide", jsonLd: [crumb([[OFFICE.name, "/"], ["راهنمای خرید ملک در سرعین", "/guide"]])],
    });
  }, []);
  return (
    <div dir="rtl" style={wrap}>
      <PublicHeader navigate={navigate} onSearchClick={() => navigate("/properties")} />
      <div style={body}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>راهنمای خرید ملک در سرعین</h1>
        <p style={{ fontSize: 14, color: pc.inkSoft, lineHeight: 2.1, marginBottom: 28 }}>پاسخ سؤال‌های رایج خریداران، بدون عدد و آمار ساختگی.</p>
        <div className="flex flex-col" style={{ gap: 12 }}>
          {GUIDES.map((g) => (
            <NavLink key={g.slug} to={`/guide/${g.slug}`} navigate={navigate} style={{ display: "block", textDecoration: "none", color: "inherit", border: `1px solid ${pc.border}`, background: pc.surface, padding: 20 }}>
              <p style={{ fontSize: 17, fontWeight: 800 }}>{g.title}</p>
              <p style={{ fontSize: 13, color: pc.inkSoft, lineHeight: 2, marginTop: 6 }}>{g.question}</p>
            </NavLink>
          ))}
        </div>
      </div>
      <PublicFooter navigate={navigate} />
    </div>
  );
}

function PublicGuideView({ slug, navigate }) {
  const g = guideBySlug(slug);
  const [listings, setListings] = useState([]);
  useEffect(() => {
    if (!g) return;
    const path = `/guide/${g.slug}`;
    setMeta(`${g.title} — ${OFFICE.name}`, g.description, {
      path,
      jsonLd: [
        { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.description, inLanguage: "fa-IR", mainEntityOfPage: SITE + path,
          author: { "@id": ORG_LD["@id"] }, publisher: { "@id": ORG_LD["@id"] }, ...(g.reviewed ? { dateModified: g.reviewed } : {}) },
        crumb([[OFFICE.name, "/"], ["راهنمای خرید ملک در سرعین", "/guide"], [g.title, path]]),
      ],
    });
    supabase.from("public_properties").select("slug, title, deal, price").order("updated_at", { ascending: false }).limit(3)
      .then(({ data }) => setListings(data || []), () => {});
  }, [slug]);
  if (!g) return <PublicGuidesIndexView navigate={navigate} />;
  const h2 = { fontSize: 20, fontWeight: 800, margin: "32px 0 10px" };
  const p = { fontSize: 14, color: pc.inkSoft, lineHeight: 2.2, marginBottom: 10 };
  const ul = { fontSize: 14, color: pc.inkSoft, lineHeight: 2.2, paddingInlineStart: 22, listStyle: "disc" };
  return (
    <div dir="rtl" style={wrap}>
      <PublicHeader navigate={navigate} onSearchClick={() => navigate("/properties")} />
      <article style={body}>
        <nav style={{ fontSize: 12, color: pc.muted, marginBottom: 16 }}>
          <NavLink to="/guide" navigate={navigate}>راهنمای خرید ملک در سرعین</NavLink>
        </nav>
        <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.6 }}>{g.title}</h1>
        <div style={{ border: `1px solid ${pc.border}`, background: pc.surface, padding: 20, margin: "20px 0" }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: pc.brand, marginBottom: 6 }}>{g.question}</p>
          <p style={{ fontSize: 15, lineHeight: 2.2 }}>{g.answer}</p>
        </div>
        <p style={p}>{g.summary}</p>
        {g.sections.map((s) => (
          <section key={s.h}>
            <h2 style={h2}>{s.h}</h2>
            {s.p.map((t, i) => <p key={i} style={p}>{t}</p>)}
          </section>
        ))}
        <h2 style={h2}>چک‌لیست خریدار</h2>
        <ul style={ul}>{g.checklist.map((t) => <li key={t}>{t}</li>)}</ul>
        <h2 style={h2}>ریسک‌های رایج</h2>
        <ul style={ul}>{g.risks.map((t) => <li key={t}>{t}</li>)}</ul>
        <h2 style={h2}>پرسش‌های متداول</h2>
        <div>
          {g.faq.map((f) => (
            <details key={f.q} className="fp-faq" style={{ borderBottom: `1px solid ${pc.border}` }}>
              <summary>{f.q}</summary>
              <p style={{ ...p, paddingBottom: 16 }}>{f.a}</p>
            </details>
          ))}
        </div>
        {listings.length > 0 && (
          <>
            <h2 style={h2}>جدیدترین فایل‌های منتشرشده</h2>
            <ul style={{ ...ul, listStyle: "none", paddingInlineStart: 0 }}>
              {listings.map((l) => (
                <li key={l.slug}><NavLink to={`/properties/${l.slug}`} navigate={navigate} style={{ color: pc.brand, textDecoration: "none", fontWeight: 700 }}>{l.title}</NavLink>{l.price ? <span style={{ color: pc.muted }}> — {fmtToman(l.price)}</span> : null}</li>
              ))}
            </ul>
          </>
        )}
        <h2 style={h2}>راهنماهای مرتبط</h2>
        <ul style={{ ...ul, listStyle: "none", paddingInlineStart: 0 }}>
          {g.related.map((r) => { const x = guideBySlug(r); return x ? <li key={r}><NavLink to={`/guide/${r}`} navigate={navigate} style={{ color: pc.brand, textDecoration: "none", fontWeight: 700 }}>{x.title}</NavLink></li> : null; })}
        </ul>
        <p style={{ ...p, marginTop: 28, fontSize: 12, color: pc.muted }}>اطلاعات این صفحه عمومی است و مشاوره‌ی حقوقی یا مالی نیست. {g.reviewed ? `آخرین بازبینی: ${g.reviewed}` : ""}</p>
        <div className="flex flex-wrap" style={{ gap: 10, marginTop: 8 }}>
          <NavLink to="/properties" navigate={navigate} className="fp-btn fp-btn-brand">مشاهده‌ی فایل‌ها</NavLink>
          <NavLink to="/contact" navigate={navigate} className="fp-btn fp-btn-line">تماس با {OFFICE.name}</NavLink>
        </div>
      </article>
      <PublicFooter navigate={navigate} />
    </div>
  );
}

export { PublicGuidesIndexView, PublicGuideView };
