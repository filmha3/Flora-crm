import { Circle, Clock, CheckCircle2, X, Flame, Heart, Meh } from "lucide-react";

const COORD_ORDER = ["none", "pending", "confirmed", "cancelled"];
const coordMeta = (c) => ({
  none: { label: "هماهنگ نشده", color: c.muted, soft: c.surface2, icon: Circle },
  pending: { label: "منتظر مالک", color: c.attn, soft: c.attnSoft, icon: Clock },
  confirmed: { label: "تأیید شد", color: c.success, soft: c.successSoft, icon: CheckCircle2 },
  cancelled: { label: "لغو شد", color: c.danger, soft: c.dangerSoft, icon: X },
});
const KEY_ORDER = ["none", "agent", "owner", "guard", "office", "other"];
const KEY_LABEL = { none: "نیاز ندارد", agent: "دست مشاور", owner: "دست مالک", guard: "نگهبانی", office: "دفتر", other: "محل دیگر" };
const DISLIKE_REASONS = ["قیمت", "متراژ", "محله", "نور", "نقشه", "طبقه", "امکانات", "پارکینگ", "سایر"];
const RATING_ORDER = ["superlike", "like", "meh", "dislike"];
const ratingMeta = (c) => ({
  superlike: { label: "خیلی پسندید", color: "#F97316", soft: "rgba(249,115,22,0.16)", icon: Flame },
  like: { label: "پسندید", color: "#EC4899", soft: "rgba(236,72,153,0.15)", icon: Heart },
  meh: { label: "متوسط", color: c.attn, soft: c.attnSoft, icon: Meh },
  dislike: { label: "نپسندید", color: c.danger, soft: c.dangerSoft, icon: X },
});
const mapsLink = (p) => p.lat && p.lng
  ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
  : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.address || p.title || "")}`;

export { COORD_ORDER, coordMeta, KEY_ORDER, KEY_LABEL, DISLIKE_REASONS, RATING_ORDER, ratingMeta, mapsLink };
