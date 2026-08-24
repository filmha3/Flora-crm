// Checks — pure grouping/aggregation logic, same reasoning as
// lib/valuation.js and lib/construction.js: no side effects, fully
// testable, and the one place the "sum per month" math actually lives so
// the UI never has to re-derive it inconsistently in two places.

import { isoToJalali, MONTHS_FA } from "./format.js";

/**
 * Groups checks by their Jalali year-month (using dueDate), computing the
 * received (دریافتی) and paid (پرداختی) totals for each month. Sorted
 * chronologically so months from different years interleave naturally —
 * there's no separate "pick a year" step, scrolling the list already moves
 * year to year once a year's checks run out.
 */
export function groupChecksByMonth(checks) {
  const groups = {};
  for (const ch of checks) {
    if (!ch.dueDate) continue;
    const [jy, jm] = isoToJalali(ch.dueDate);
    const key = `${jy}-${String(jm).padStart(2, "0")}`;
    if (!groups[key]) groups[key] = { key, jy, jm, label: `${MONTHS_FA[jm - 1]} ${jy}`, checks: [], totalReceived: 0, totalPaid: 0 };
    groups[key].checks.push(ch);
    const type = ch.type || "پرداختی"; // existing checks created before this field existed default to پرداختی
    if (type === "دریافتی") groups[key].totalReceived += ch.amount || 0;
    else groups[key].totalPaid += ch.amount || 0;
  }
  return Object.values(groups)
    .map((g) => ({ ...g, checks: g.checks.sort((a, b) => a.dueDate.localeCompare(b.dueDate)) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
