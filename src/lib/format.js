// Jalali calendar conversion, Persian/Latin digit normalization, and the
// handful of formatting helpers (money, ids, dates) used everywhere.
// ---------- Jalali (Persian) calendar helpers ----------
const div = (a, b) => Math.floor(a / b);
// Latin digits read faster for money and phone numbers; Persian month names stay Persian.
const faDigits = (v) => String(v);
const MONTHS_FA = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
const WEEK_FA = ["ش","ی","د","س","چ","پ","ج"];
const LEAP_CYCLE = [1, 5, 9, 13, 17, 22, 26, 30];
const isLeapJalali = (jy) => LEAP_CYCLE.includes(((jy % 33) + 33) % 33);
function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 365 * gy + div(gy2 + 3, 4) - div(gy2 + 99, 100) + div(gy2 + 399, 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * div(days, 12053); days %= 12053;
  jy += 4 * div(days, 1461); days %= 1461;
  if (days > 365) { jy += div(days - 1, 365); days = (days - 1) % 365; }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}
function jalaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + 365 * jy + div(jy, 33) * 8 + div(((jy % 33) + 3), 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097); days %= 146097;
  if (days > 36524) { gy += 100 * div(--days, 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * div(days, 1461); days %= 1461;
  if (days > 365) { gy += div(days - 1, 365); days = (days - 1) % 365; }
  const gd0 = days + 1;
  const isLeapG = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const sal = [0, 31, isLeapG ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0, gd = gd0;
  for (gm = 1; gm <= 12; gm++) { if (gd <= sal[gm]) break; gd -= sal[gm]; }
  return [gy, gm, gd];
}
const isoToJalali = (iso) => { const [gy, gm, gd] = iso.split("-").map(Number); return gregorianToJalali(gy, gm, gd); };
const jalaliToIso = (jy, jm, jd) => { const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd); return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`; };
const fmtJalali = (iso) => { const [jy, jm, jd] = isoToJalali(iso); return `${faDigits(jd)} ${MONTHS_FA[jm - 1]} ${faDigits(jy)}`; };
const jalaliMonthLength = (jy, jm) => (jm <= 6 ? 31 : jm <= 11 ? 30 : isLeapJalali(jy) ? 30 : 29);
const jalaliFirstWeekday = (jy, jm) => { const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1); return (new Date(gy, gm - 1, gd).getDay() + 1) % 7; };


const toEnDigits = (s) => String(s ?? "")
  .replace(/[۰-۹٠-٩]/g, (d) => {
    const p = "۰۱۲۳۴۵۶۷۸۹".indexOf(d); if (p > -1) return p;
    const a = "٠١٢٣٤٥٦٧٨٩".indexOf(d); return a > -1 ? a : d;
  });
// Persian users write decimals with ٫ or / (e.g. ۰/۵ = 0.5). Use this for any
// numeric input where a fraction is allowed, so "۰/۵" and "0.5" both mean 0.5.
const toDecimal = (v) => Number(toEnDigits(v).replace(/[٫،/]/g, ".").replace(/[^0-9.]/g, "")) || 0;
const toNum = (v) => Number(toEnDigits(v).replace(/[^0-9.]/g, "")) || 0;

// Parses key fields out of ad text the user pasted (Divar disallows automated fetching,
// so this works on text a human already copied from their own browser — not a scraper).
function parseDivarText(raw) {
  const norm = toEnDigits(raw || "");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const title = lines[0] || "";
  const areaMatch = norm.match(/(\d{2,4})\s*متر/);
  const roomsMatch = norm.match(/(\d)\s*(خواب|اتاق)/);
  const floorMatch = norm.match(/طبقه[:\s]*(\d{1,2})/);
  let deal = "فروش";
  if (/پیش[\s\u200c]?فروش/.test(raw)) deal = "پیش‌فروش";
  const priceMatches = [...norm.matchAll(/([\d,]{6,})\s*تومان/g)].map((m) => Number(m[1].replace(/,/g, "")));
  const price = priceMatches.length ? Math.max(...priceMatches) : 0;
  const area = areaMatch ? Number(areaMatch[1]) : 0;
  const pricePerMeter = price && area ? Math.round(price / area) : 0;
  const furnished = /با\s*لوازم|فول\s*مبله|مبله/.test(raw) ? "با لوازم" : "بدون لوازم";
  let type = "آپارتمان";
  if (/ویلا/.test(raw)) type = "ویلا"; else if (/زمین|کلنگی/.test(raw)) type = "زمین"; else if (/مغازه|تجاری/.test(raw)) type = "مغازه"; else if (/اداری|دفتر\s*کار/.test(raw)) type = "اداری";
  return { title, type, deal, area: area || "", pricePerMeter: pricePerMeter || "", rooms: roomsMatch ? roomsMatch[1] : "", floor: floorMatch ? floorMatch[1] : "1", furnished };
}

const uid = () => Math.random().toString(36).slice(2, 10);
const fmtToman = (n) => (n ? Math.round(n).toLocaleString("de-DE") : "0") + " تومان";
const todayISO = () => new Date().toISOString().slice(0, 10);

export { div, faDigits, MONTHS_FA, WEEK_FA, LEAP_CYCLE, isLeapJalali, gregorianToJalali, jalaliToGregorian, isoToJalali, jalaliToIso, fmtJalali, jalaliMonthLength, jalaliFirstWeekday, toEnDigits, toDecimal, toNum, parseDivarText, uid, fmtToman, todayISO };
