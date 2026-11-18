// time-ago — THE spelling of every duration: how long ago, how long, how
// long until (user decisions 2026-10-20: "SSOT the time countdown
// everywhere, using the same format"; 2026-11-17: "h", never "hr", and a
// set of STANDARD STYLES to quote by name from now on).
//
// THE STANDARD STYLES — a readout is named "<style> <shape>", e.g. "Short
// ago" or "Full span":
//
//   SHORT     columns, cards, terminal rows: anywhere tight
//   FULL      sentences, "Last updated", the status line: words in full
//   CLOCK     counting down to a moment: 01:20 · 27:05 (the status line's
//             and the sun's; spelled where they are — sun-countdown and
//             claude.sh — not here)
//   CALENDAR  a thing with only a date: today · yesterday · 3 days ago ·
//             in 2 years 1 month (relative-time.js's `relative-time-coarse`)
//
// THE SHAPES, in Short and Full:
//
//   shape   Short                  Full                      function
//   ago     3 min ago              3 minutes ago             agoText / fullAgoText
//   span    2 h 5 min              2 hours 5 minutes         spanText / fullSpanText
//   until   in 1 h 20 min          in 1 hour 20 minutes      untilText / fullUntilText
//   unit    15 min                 15 minutes                unitText / fullUnitText
//
// THE LADDER is one for every style: s → min → h → d, then (ago and unit)
// weeks from 14 days, months from 9 weeks, years from 12 months. An ago or
// a unit is one whole unit, rounded down; a span is at most two, larger
// first, the second left out at zero; an until is a span to the minute,
// rounded up, "now" once it has come. "just now" for the first second only
// (user decision 2026-10-20: a label that ticks every second counts 1, 2,
// 3 … rather than jumping from "just now" to "5 s"). CALENDAR counts in
// days up to 60, then months and years.
//
// The short units are the Lifespan Atlas's own (d, w, mo, yr), so a
// duration and a life span share one vocabulary.
//
// THE SAME RULE IN PYTHON is 引擎 Engines/time_ago — `python -m time_ago
// --check` runs both over the same seconds and fails on any difference.
// Who reads this file:
//
//   · 界面 UI/page-widgets/relative-time.js — inlined into pages by
//     `index_page.read_relative_time_js`, which places this file's text
//     (its `export` dropped) in front of it;
//   · 界面 UI/page-widgets/stats-table.js — `import()`s it from beside
//     itself (../../引擎 Engines/time-ago/), the same hop on the website and
//     on the /workshop/ mount;
//   · the Lifespan Atlas — the `time-ago` alias (vite.config.ts,
//     vitest.config.ts, tsconfig.app.json), as `sun-countdown` is.
//
// Ships with the website (`.public`). Pure: no DOM, no clock — the caller
// passes the seconds.

// [seconds per unit, its word], largest first.
const SPAN_UNITS = [[86400, "d"], [3600, "h"], [60, "min"], [1, "s"]];

/** The one whole unit an "ago" is told in. */
function agoUnit(s) {
  if (s < 60) return [s, "s"];
  if (s < 3600) return [Math.floor(s / 60), "min"];
  if (s < 86400) return [Math.floor(s / 3600), "h"];
  if (s < 1209600) return [Math.floor(s / 86400), "d"];
  if (s < 5443200) return [Math.floor(s / 604800), "w"];
  if (s < 31557600) return [Math.floor(s / 2629800), "mo"];
  return [Math.floor(s / 31557600), "yr"];
}

/** `seconds` (clamped at 0, floored) in its one whole unit: "5 h",
 *  "15 min" — an "ago" without the word, for a column or "every 6 h". */
export function unitText(seconds) {
  const [n, unit] = agoUnit(Math.max(0, Math.floor(seconds)));
  return `${n} ${unit}`;
}

/** `seconds` elapsed (clamped at 0, floored): "just now", "3 min ago". */
export function agoText(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 1) return "just now";
  const [n, unit] = agoUnit(s);
  return `${n} ${unit} ago`;
}

/** `seconds` (clamped at 0, floored) as {d, h, m, s}: each "" or its part
 *  ("3 min"), at most two set, the larger first — for a page that stands
 *  each unit in its own column. */
export function durationUnits(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const keys = ["d", "h", "m", "s"];
  const out = { d: "", h: "", m: "", s: "" };
  const i = SPAN_UNITS.findIndex(([n]) => s >= n);
  const lead = i < 0 ? 3 : i;
  const [big, word] = SPAN_UNITS[lead];
  out[keys[lead]] = `${Math.floor(s / big)} ${word}`;
  if (lead < 3) {
    const [small, word2] = SPAN_UNITS[lead + 1];
    const rest = Math.floor((s % big) / small);
    if (rest) out[keys[lead + 1]] = `${rest} ${word2}`;
  }
  return out;
}

/** `seconds` as a span: "45 s", "2 h 5 min", "1 d 3 h". */
export function spanText(seconds) {
  const u = durationUnits(seconds);
  return [u.d, u.h, u.m, u.s].filter(Boolean).join(" ");
}

// Each short unit's word in full.
const FULL_WORDS = { s: "second", min: "minute", h: "hour", d: "day",
                     w: "week", mo: "month", yr: "year" };
const fullPart = (n, unit) => `${n} ${FULL_WORDS[unit]}${n === 1 ? "" : "s"}`;

/** `seconds` in its one whole unit, in words: "15 minutes", "5 hours". */
export function fullUnitText(seconds) {
  const [n, unit] = agoUnit(Math.max(0, Math.floor(seconds)));
  return fullPart(n, unit);
}

/** `seconds` elapsed, in words: "just now", "3 minutes ago". */
export function fullAgoText(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return s < 1 ? "just now" : `${fullUnitText(s)} ago`;
}

/** `seconds` as a span in words: "45 seconds", "1 hour 5 minutes",
 *  "4 days 2 hours". */
export function fullSpanText(seconds) {
  const u = durationUnits(seconds);
  return [u.d, u.h, u.m, u.s].filter(Boolean).map((p) => {
    const [n, unit] = p.split(" ");
    return fullPart(Number(n), unit);
  }).join(" ");
}

/** Full until: "in 1 hour 20 minutes", or "now". */
export function fullUntilText(seconds) {
  const s = Math.ceil(seconds / 60) * 60;
  return s <= 0 ? "now" : `in ${fullSpanText(s)}`;
}

/** `seconds` until something, to the minute (rounded up): "in 1 h 20 min".
 *  "now" once it has come. */
export function untilText(seconds) {
  const s = Math.ceil(seconds / 60) * 60;
  return s <= 0 ? "now" : `in ${spanText(s)}`;
}
