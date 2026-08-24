// Construction Projects — pure functions only, same reasoning as
// lib/valuation.js: no DOM/storage access, just transaction arrays already
// in memory, so every number here is directly testable and never guessed.

import { isoToJalali } from "./format.js";

/**
 * Whole-project totals — spent so far, outstanding debt (بدهی, money owed
 * TO suppliers), outstanding receivable (طلب, money owed BACK to the
 * project), and a category breakdown. Nothing here is time-windowed; see
 * computeMonthlyReport for a specific month.
 */
export function computeProjectStats(transactions, projectId) {
  const rows = transactions.filter((t) => t.projectId === projectId);
  const payments = rows.filter((t) => t.type === "payment");
  const payables = rows.filter((t) => t.type === "payable");
  const receivables = rows.filter((t) => t.type === "receivable");

  const totalSpent = payments.reduce((s, t) => s + (t.amount || 0), 0);
  const totalPayable = payables.reduce((s, t) => s + (t.amount || 0), 0);
  const totalReceivable = receivables.reduce((s, t) => s + (t.amount || 0), 0);

  const byCategory = {};
  for (const t of payments) {
    const cat = t.category || "سایر";
    byCategory[cat] = (byCategory[cat] || 0) + (t.amount || 0);
  }
  const categoryBreakdown = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalSpent, totalPayable, totalReceivable,
    count: rows.length,
    categoryBreakdown,
  };
}

/**
 * One calendar month's report for a project, grouped the way the spec asks
 * for (per-category breakdown, top spenders, count) plus a real comparison
 * against the immediately preceding month — never a guessed percentage,
 * computed directly from that month's own transactions or explicitly
 * absent if there's nothing to compare against.
 */
export function computeMonthlyReport(transactions, projectId, jy, jm) {
  const rows = transactions.filter((t) => {
    if (t.projectId !== projectId || t.type !== "payment" || !t.date) return false;
    const [ty, tm] = isoToJalali(t.date);
    return ty === jy && tm === jm;
  });

  const total = rows.reduce((s, t) => s + (t.amount || 0), 0);
  const byCategory = {};
  for (const t of rows) {
    const cat = t.category || "سایر";
    byCategory[cat] = (byCategory[cat] || 0) + (t.amount || 0);
  }
  const categoryBreakdown = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Previous Jalali month, handling the year rollover at month 1.
  const prevJy = jm === 1 ? jy - 1 : jy;
  const prevJm = jm === 1 ? 12 : jm - 1;
  const prevRows = transactions.filter((t) => {
    if (t.projectId !== projectId || t.type !== "payment" || !t.date) return false;
    const [ty, tm] = isoToJalali(t.date);
    return ty === prevJy && tm === prevJm;
  });
  const prevTotal = prevRows.reduce((s, t) => s + (t.amount || 0), 0);

  let comparisonPct = null;
  if (prevTotal > 0) comparisonPct = Math.round(((total - prevTotal) / prevTotal) * 100);

  return {
    total, count: rows.length, categoryBreakdown,
    topCategory: categoryBreakdown[0] || null,
    prevTotal, comparisonPct,
  };
}
