import { Home, Building2, Trees, Store, Briefcase } from "lucide-react";
import { faDigits, fmtToman } from "./format.js";

const TYPE_ICON = { "آپارتمان": Building2, "ویلا": Home, "زمین": Trees, "مغازه": Store, "اداری": Briefcase };
const typeIcon = (t) => TYPE_ICON[t] || Building2;
// Flora-branded icon per property type / deal, used where the brand icons shine.
const floraTypeIcon = (t, deal) => {
  if (deal === "پیش‌فروش") return "investment";
  if (t === "ویلا" || t === "زمین") return "villa";
  if (t === "مغازه" || t === "اداری") return "multiunit";
  return "residential";
};

const STAGES = ["فعال", "در حال مذاکره", "فروخته شد"];
// Where a buyer is in their journey — cleaned-up, agent-friendly labels.
const CUSTOMER_STAGES = ["در حال بررسی", "دنبال سرمایه‌گذاری", "دنبال پیش‌فروش", "خرید کرد", "منصرف شد", "بدون پیگیری"];
// Investment Center (Portfolio) — Phase 1 constants
const INVESTMENT_STATUSES = ["در حال بررسی", "خریداری‌شده", "در حال بازسازی", "برای فروش", "فروخته‌شده"];
const INVESTMENT_TYPES = ["خرید و نگهداری", "بازسازی و فروش", "پیش‌خرید", "مشارکت در ساخت"];
const INVESTMENT_EXPENSE_CATEGORIES = ["کمیسیون", "مالیات", "دفترخانه", "انتقال سند", "بازسازی", "کابینت", "رنگ", "کناف", "برق", "لوله‌کشی", "آسانسور", "پارکینگ", "بیمه", "وام", "بهره", "تبلیغات", "نظافت", "حمل", "سایر"];
// Payments and checks are merged into one ledger — a check is just a payment
// with a due date and a clearing status, not a separate system.
const INVESTMENT_PAYMENT_METHODS = ["نقد", "کارت", "حواله", "انتقال بانکی", "چک"];
const CHECK_STATUSES = ["در انتظار", "پاس شده", "برگشت خورده", "باطل شده"];
const CUSTOMER_STAGE_COLOR = (c) => ({
  "در حال بررسی": c.primary,
  "دنبال سرمایه‌گذاری": c.purple,
  "دنبال پیش‌فروش": c.attn,
  "خرید کرد": c.success,
  "منصرف شد": c.danger,
  "بدون پیگیری": c.muted,
});
// Compact money for budgets: 10000000000 → "۱۰ میلیارد", 850000000 → "۸۵۰ میلیون".
const fmtBudgetShort = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e9) { const b = n / 1e9; return `${faDigits(Number.isInteger(b) ? b : b.toFixed(1))} میلیارد`; }
  if (n >= 1e6) { const m = Math.round(n / 1e6); return `${faDigits(m)} میلیون`; }
  if (n > 0) return fmtToman(n);
  return "—";
};
const BUILD_STAGES = ["گودبرداری", "فونداسیون", "اسکلت", "سفت‌کاری", "نازک‌کاری", "نما", "آماده تحویل"];
const DEAL_FILTERS = ["همه", "فروش", "پیش‌فروش"];
const TYPE_FILTERS = ["همه", "آپارتمان", "ویلا", "زمین", "مغازه", "اداری"];
const STAGE_FILTERS = ["همه", "فعال", "در حال مذاکره", "فروخته شد"];

export { TYPE_ICON, typeIcon, floraTypeIcon, STAGES, CUSTOMER_STAGES, INVESTMENT_STATUSES, INVESTMENT_TYPES, INVESTMENT_EXPENSE_CATEGORIES, INVESTMENT_PAYMENT_METHODS, CHECK_STATUSES, CUSTOMER_STAGE_COLOR, fmtBudgetShort, BUILD_STAGES, DEAL_FILTERS, TYPE_FILTERS, STAGE_FILTERS };
