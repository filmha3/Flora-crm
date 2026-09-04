import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// The whole point of this function: Legal Assistant's own AI calls (chat,
// document analysis, contract clauses) go Frontend → this function → AI
// provider, instead of the browser calling the provider directly with the
// key attached — the pattern the rest of the app still uses (untouched,
// out of scope; Legal is the one place being rebuilt to not do this).
// The client still supplies its own key each request (same bring-your-own-
// key model as everywhere else in Flora, not a new server-managed-keys
// system) — it's just never visible in a request the browser makes to a
// third party, and it's never written to disk or logged here.

const SYSTEM_PROMPT = `تو FLORA LEGAL هستی، دستیار حقوقی هوش‌مصنوعی برای یک مشاور املاک ایرانی — نه یک وکیل واقعی و نه جایگزین وکیل دادگستری.

سبک پاسخ (ASD-STE100):
- جمله‌های کوتاه، زبان ساده، مستقیم، عملی.
- بدون اصطلاح پیچیده‌ی غیرضروری.
- نتیجه را همیشه اول بگو.

ساختار پیش‌فرض پاسخ (وقتی سؤال واقعی حقوقی است):
نتیجه: ...
چرا: ...
اقدام پیشنهادی:
1. ...
2. ...

قوانین:
- فقط وقتی سؤال کن که واقعاً برای پاسخ دقیق لازم است — یک سؤال کوتاه و طبیعی، نه چند سؤال با هم، نه فرم.
- هر جا موضوع نیاز به بررسی تخصصی وکیل دارد، صریح بگو.
- خودت را وکیل دارای مجوز معرفی نکن؛ در موارد حساس بگو این اطلاعات حقوقی عمومی است.
- اگر کاربر خواست بند قرارداد بنویسی، مستقیم متن پیشنهادی بند را بده (نه توضیح درباره‌ی بند) — فقط اگر اطلاعات ضروری برای آن بند را نداری، همان مورد را بپرس.
- اگر تصویر یا PDF سندی برایت فرستاده شده، محتوای واقعی آن را بخوان و تحلیل کن — چیزی را که در سند نیست حدس نزن.`;

interface ChatMessage { role: "user" | "assistant"; content: string }

async function callGemini(key: string, model: string, messages: ChatMessage[], attachment?: { mime: string; base64: string }) {
  const contents = messages.map((m, i) => {
    const isLast = i === messages.length - 1;
    const parts: unknown[] = [{ text: m.content }];
    if (isLast && m.role === "user" && attachment) parts.push({ inline_data: { mime_type: attachment.mime, data: attachment.base64 } });
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system_instruction: { parts: [{ text: SYSTEM_PROMPT }] }, contents }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `خطای Gemini (کد ${res.status})`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("");
  if (!text) throw new Error("پاسخ خالی از Gemini");
  return text;
}

async function callOpenAiCompatible(baseUrl: string, key: string, model: string, messages: ChatMessage[], attachment?: { mime: string; base64: string }, errLabel = "سرویس") {
  const oaMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m, i) => {
      const isLast = i === messages.length - 1;
      if (isLast && m.role === "user" && attachment) {
        if (attachment.mime === "application/pdf") throw new Error("این ارائه‌دهنده تحلیل PDF را پشتیبانی نمی‌کند — از Gemini استفاده کن.");
        return { role: "user", content: [{ type: "text", text: m.content }, { type: "image_url", image_url: { url: `data:${attachment.mime};base64,${attachment.base64}` } }] };
      }
      return { role: m.role, content: m.content };
    }),
  ];
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: oaMessages }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `خطای ${errLabel} (کد ${res.status})`);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`پاسخ خالی از ${errLabel}`);
  return text;
}

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: cors });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

  // The user's own JWT, forwarded — not the service role. Storage reads
  // below go through this client, so RLS (scoped to the caller's own uid
  // folder in legal-attachments) is what actually enforces "a conversation's
  // attachment can only ever be read by the person who uploaded it," the
  // same guarantee every other bucket in this project already has.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

  let body: {
    provider?: string; key?: string; model?: string;
    messages?: ChatMessage[]; attachmentPath?: string; attachmentType?: "image" | "pdf";
  };
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "invalid request body" }), { status: 400, headers: cors }); }

  const { provider, key, model, messages, attachmentPath, attachmentType } = body;
  if (!provider || !key) return new Response(JSON.stringify({ error: "کلید هوش مصنوعی لازم است" }), { status: 400, headers: cors });
  if (!messages?.length) return new Response(JSON.stringify({ error: "پیام خالی است" }), { status: 400, headers: cors });

  let attachment: { mime: string; base64: string } | undefined;
  if (attachmentPath) {
    const { data: fileBlob, error: dlErr } = await supabase.storage.from("legal-attachments").download(attachmentPath);
    if (dlErr || !fileBlob) return new Response(JSON.stringify({ error: "فایل پیوست پیدا نشد" }), { status: 404, headers: cors });
    const buf = new Uint8Array(await fileBlob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    attachment = { mime: attachmentType === "pdf" ? "application/pdf" : (fileBlob.type || "image/webp"), base64: btoa(binary) };
  }

  // Keep the payload/token cost bounded — a running legal conversation
  // doesn't need its full history re-sent on every turn to answer well.
  const trimmed = messages.slice(-16);

  try {
    let text: string;
    if (provider === "gemini") text = await callGemini(key, model || "gemini-2.0-flash", trimmed, attachment);
    else if (provider === "avalai") text = await callOpenAiCompatible("https://api.avalai.ir/v1", key, model || "gpt-4o-mini", trimmed, attachment, "AvalAI");
    else if (provider === "perplexity") {
      if (attachment) return new Response(JSON.stringify({ error: "Perplexity از تحلیل تصویر/PDF پشتیبانی نمی‌کند — از Gemini یا AvalAI استفاده کن." }), { status: 400, headers: cors });
      text = await callOpenAiCompatible("https://api.perplexity.ai", key, "sonar", trimmed, undefined, "Perplexity");
    } else return new Response(JSON.stringify({ error: "ارائه‌دهنده‌ی هوش مصنوعی نامعتبر" }), { status: 400, headers: cors });

    return new Response(JSON.stringify({ text }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "خطای نامشخص" }), { status: 502, headers: cors });
  }
});
