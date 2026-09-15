import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function deleteAllInFolder(admin, bucket, uid) {
  // Storage doesn't cascade with the database — every file under this
  // user's own folder in each bucket has to be listed and removed
  // explicitly, or it would sit there forever as storage nobody can
  // reach, orphaned once the account (and the RLS policies scoped to that
  // uid) is gone.
  const { data: files } = await admin.storage.from(bucket).list(uid, { limit: 1000 });
  if (!files?.length) return;
  // Files can be nested one level deeper (propertyId/photo.webp) — list
  // each subfolder too rather than assuming a flat structure.
  const paths = [];
  for (const f of files) {
    if (f.id === null) {
      // a "folder" entry (no id) — list what's inside it
      const { data: inner } = await admin.storage.from(bucket).list(`${uid}/${f.name}`, { limit: 1000 });
      for (const g of inner || []) paths.push(`${uid}/${f.name}/${g.name}`);
    } else {
      paths.push(`${uid}/${f.name}`);
    }
  }
  if (paths.length) await admin.storage.from(bucket).remove(paths).catch(() => {});
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers: cors });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

  // The caller's own JWT decides WHO gets deleted — never a value from the
  // request body, so there is no way to pass someone else's id in and
  // delete their account instead of your own.
  const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
  const uid = userData.user.id;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    await Promise.all([
      deleteAllInFolder(admin, "property-photos", uid),
      deleteAllInFolder(admin, "legal-attachments", uid),
      deleteAllInFolder(admin, "backups", uid),
    ]);
    // Every table with a foreign key to auth.users in this project is
    // ON DELETE CASCADE (verified against the schema before writing this),
    // so this one call is what actually removes flora_data, backups,
    // notifications, push subscriptions, the profile row, everything.
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) throw delErr;
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "حذف حساب ناموفق بود" }), { status: 500, headers: cors });
  }
});
