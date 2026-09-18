// Publishing a property means writing a deliberately narrow, sanitized copy
// into public_properties — never exposing the agent's own flora_data record
// (which carries owner phone numbers, private notes, commission) to the
// public site. The source of truth for the agent's own CRM never changes;
// this is purely an export, kept in sync only when the agent explicitly
// publishes/edits/unpublishes.
import { supabase } from "./supabaseClient.js";

// Amenities live only as free-text lines in `desc` (see legalAttachments.js
// and get-property-share for the same convention) — pulled out the same
// way here rather than exposing the whole description, which can carry the
// agent's own private shorthand notes.
function extractAmenities(desc) {
  if (!desc) return [];
  const out = [];
  if (/پارکینگ:\s*دارد/.test(desc)) out.push("پارکینگ");
  if (/آسانسور:\s*دارد/.test(desc)) out.push("آسانسور");
  if (/انباری:\s*دارد/.test(desc)) out.push("انباری");
  return out;
}

// Persian-friendly slug: the title, kept mostly as-is (Persian characters
// are valid in a URL path segment and this is what the spec explicitly
// asked for), with spaces turned to dashes and a short suffix from the
// property's own id so two properties with the same title never collide.
function slugify(title, id) {
  const base = (title || "ملک")
    .trim()
    .replace(/[\/\?\#\&\=\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base}-${id.slice(0, 8)}`;
}

async function publishProperty({ userId, property, agentName, agencyName, agentPhone }) {
  const cover = (property.media || []).find((m) => m.type === "image" && m.storagePath);
  const gallery = (property.media || []).filter((m) => m.type === "image" && m.storagePath).map((m) => m.storagePath).slice(0, 20);
  const row = {
    id: property.id,
    user_id: userId,
    slug: slugify(property.title, property.id),
    title: property.title || "بدون عنوان",
    deal: property.deal || null,
    property_type: property.type || null,
    area: property.area || null,
    rooms: property.rooms ?? null,
    floor: property.floor ?? null,
    city: null, // no dedicated city field on a property yet — address carries it
    address: property.address || null,
    price: property.price || null,
    price_per_meter: property.pricePerMeter || null,
    amenities: [
      ...extractAmenities(property.desc),
      ...(property.furnished === "با لوازم" ? ["فرنیش کامل"] : []),
    ],
    cover_path: cover?.storagePath || null,
    gallery_paths: gallery,
    agent_name: agentName || null,
    agency_name: agencyName || null,
    agent_phone: agentPhone || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("public_properties").upsert(row);
  if (error) throw error;
  return row.slug;
}

async function unpublishProperty(propertyId) {
  const { error } = await supabase.from("public_properties").delete().eq("id", propertyId);
  if (error) throw error;
}

async function isPropertyPublished(propertyId) {
  const { data } = await supabase.from("public_properties").select("id").eq("id", propertyId).maybeSingle();
  return !!data;
}

function publicImageUrl(path) {
  if (!path) return null;
  return `https://grbtuoaoygpbtjrmxbkp.supabase.co/storage/v1/object/public/property-photos/${path}`;
}

export { slugify, publishProperty, unpublishProperty, isPropertyPublished, publicImageUrl, extractAmenities };
