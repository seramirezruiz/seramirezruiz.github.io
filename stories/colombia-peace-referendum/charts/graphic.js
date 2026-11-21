import { scaleLinear } from "../../engine/vendor/d3.js";
import { xAxisMarks } from "../../engine/charts/axes.js";
import { hbarPath, arrowPath } from "../../engine/charts/marks.js";
const P = { l: 2, r: 4 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const f1 = (v) => v.toFixed(1);
const signed = (v, d = 1) => `${v >= 0 ? "+" : "\u2212"}${Math.abs(v).toFixed(d)}`;
const DAY0 = Date.UTC(2016, 7, 1);
const NDAYS = 92;
const dayIndex = (iso) => Math.round((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - DAY0) / 864e5);
const SPLIT_DAY = dayIndex("2016-10-03");
const ORDER = { negotiation: 0, military: 1, "no answer": 2 };
function wrap(text, maxWidth, fontPx) {
  const maxChars = Math.max(8, Math.floor(maxWidth / (fontPx * 0.55)));
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if ((line + " " + word).trim().length > maxChars && line) {
      lines.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}
export default function createGraphic({ data, htmlLayer }) {
  const { respondents, items, estimates, polls, numbers } = data;
  const N = (k) => {
    const v = numbers.values[k];
    if (!v) throw new Error(`numbers.json has no key ${k}`);
    return v;
  };
  const disp = (k) => N(k).display;
  const val = (k) => N(k).value;
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
  const est = (o, s) => estimates.find((e) => e.outcome === o && e.spec === s);
  buildPhoto(htmlLayer);
  function calendarLayout({ w, h }) {
    const dw = (w - P.l - P.r) / NDAYS;
    const counts = /* @__PURE__ */ new Map();
    for (const r2 of respondents) counts.set(r2.date, (counts.get(r2.date) || 0) + 1);
    const maxStack = Math.max(...counts.values());
    const base = h - 30, top = 34;
    const s = Math.min(dw, (base - top) / maxStack);
    const r = Math.max(1.1, s * 0.42);
    const k = /* @__PURE__ */ new Map();
    const pos = respondents.map((d) => {
      const i = k.get(d.date) || 0;
      k.set(d.date, i + 1);
      return { x: P.l + (dayIndex(d.date) + 0.5) * dw, y: base - (i + 0.5) * s };
    });
    return { pos, r, base, top, dw, xDay: (i) => P.l + i * dw };
  }
  function blocksLayout({ w, h, desktop }) {
    const pre = respondents.map((d, i) => ({ d, i })).filter((o) => !o.d.post);
    const post = respondents.map((d, i) => ({ d, i })).filter((o) => o.d.post);
    const sortFn = (a, b) => ORDER[a.d.answer] - ORDER[b.d.answer] || a.i - b.i;
    pre.sort(sortFn);
    post.sort(sortFn);
    const cols = desktop ? 32 : 36;
    const rowsPre = Math.ceil(pre.length / cols), rowsPost = Math.ceil(post.length / cols);
    const labelH = 22, barH = 44;
    let s, x0Pre, x0Post, yPre, yPost;
    if (w >= 560) {
      const gap = 36;
      s = Math.min((w - P.l - P.r - gap) / (2 * cols), (h - labelH - barH - 10) / rowsPre);
      const blockW2 = cols * s;
      x0Pre = P.l + (w - P.l - P.r - (2 * blockW2 + gap)) / 2;
      x0Post = x0Pre + blockW2 + gap;
      yPre = yPost = labelH + 4;
    } else {
      s = Math.min((w - P.l - P.r) / cols, (h - 2 * (labelH + barH) - 6) / (rowsPre + rowsPost));
      x0Pre = x0Post = P.l + (w - P.l - P.r - cols * s) / 2;
      yPre = labelH + 4;
      yPost = yPre + rowsPre * s + barH + labelH + 6;
    }
    const pos = new Array(respondents.length);
    const place = (arr, x0, y0) => arr.forEach((o, j) => {
      pos[o.i] = { x: x0 + (j % cols + 0.5) * s, y: y0 + (Math.floor(j / cols) + 0.5) * s };
    });
    place(pre, x0Pre, yPre);
    place(post, x0Post, yPost);
    const blockW = cols * s;
    return { pos, r: Math.max(1.2, s * 0.4), s, blockW, pre: { x0: x0Pre, y0: yPre, bottom: yPre + rowsPre * s }, post: { x0: x0Post, y0: yPost, bottom: yPost + rowsPost * s } };
  }
  function dots(pos, r, style = () => ({}), opts = {}) {
    return respondents.map((d, i) => {
      const s = style(d);
      return { type: "circle", key: `r${i}`, cx: pos[i].x, cy: pos[i].y, r: s.r ?? r, cls: `dot nostroke ${s.cls || ""}`.trim(), opacity: s.opacity ?? 1, delay: opts.stagger ? Math.round(opts.stagger * (i / respondents.length) * 1e3) : 0 };
    });
  }
  const hiddenOnCalendar = (size) => {
    const C = calendarLayout(size);
    return dots(C.pos, 0, () => ({ opacity: 0 }));
  };
  const hiddenInBlocks = (size) => {
    const B = blocksLayout(size);
    return dots(B.pos, B.r, () => ({ opacity: 0 }));
  };
  const answerCls = (d) => d.answer === "negotiation" ? "dot--accent" : d.answer === "military" ? "" : "dot--faint";
  function calendarAxis(C, size) {
    const m = [{ type: "line", key: "cal-axis", x1: P.l, x2: size.w - P.r, y1: C.base + 1, y2: C.base + 1, cls: "grid" }];
    for (const [label, iso] of [["Aug", "2016-08-01"], ["Sep", "2016-09-01"], ["Oct", "2016-10-01"], ["Nov", "2016-11-01"]]) {
      const x = C.xDay(dayIndex(iso));
      m.push({ type: "line", key: `cal-tick-${label}`, x1: x, x2: x, y1: C.base + 1, y2: C.base + 6, cls: "grid" });
      if (label !== "Nov") m.push({ type: "text", key: `cal-m-${label}`, x: x + 3, y: C.base + 18, text: label, cls: "t-tick" });
    }
    return m;
  }
  const SHORT = { agreement: "Support the signed Santos\u2013FARC agreement", politics: "Ex-FARC members can take part in politics", guarantees: "FARC parties get the same guarantees", five_eight: "Five to eight years for those who confess", no_jail: "No jail for rank-and-file members", regions: "Ex-fighters concentrate in some regions" };
  const r1 = (v) => Math.round(v * 10) / 10;
  function itemsChart(size, mode) {
    const { w, h } = size;
    const ids = ["agreement", "politics", "guarantees", "five_eight", "no_jail", "regions"];
    const x = scaleLinear().domain([1, 7]).range([P.l + 10, w - P.r - 44]);
    const top = 28, gapAfterAgreement = 26;
    const rowH = clamp((h - top - 40 - gapAfterAgreement) / ids.length, 38, 62);
    const marks = [...xAxisMarks({ key: "it", scale: x, ticks: [1, 2, 3, 4, 5, 6, 7], y0: top - 6, y1: top + ids.length * rowH + gapAfterAgreement, labelY: top + ids.length * rowH + gapAfterAgreement + 14, format: String })];
    marks.push({ type: "text", key: "it-axis-t", x: w - P.r - 44, y: top + ids.length * rowH + gapAfterAgreement + 28, anchor: "end", text: "1 = strongly disagree \xB7 7 = strongly agree", cls: "t-note" });
    ids.forEach((id, i) => {
      const it = itemById[id];
      const y = top + i * rowH + (i > 0 ? gapAfterAgreement : 0);
      const isAgr = id === "agreement";
      const show = mode === "concessions" || isAgr;
      const op = show ? mode === "concessions" && isAgr ? 0.55 : 1 : 0;
      const cy = y + rowH * 0.62;
      const xa = x(it.pre), xb = x(it.post);
      marks.push({ type: "text", key: `it-l-${id}`, x: P.l, y: y + 12, text: SHORT[id], cls: isAgr ? "t-strong halo" : "t-label halo", opacity: op });
      marks.push({ type: "path", key: `it-a-${id}`, d: arrowPath(xa + 5, cy, Math.max(xa + 6, xb - 1), cy, 6), enter: { d: arrowPath(xa + 5, cy, xa + 6, cy, 6) }, cls: isAgr ? "arrow" : "arrow-accent", opacity: op });
      marks.push({ type: "circle", key: `it-pre-${id}`, cx: xa, cy, r: 4.5, cls: "dot", opacity: op });
      marks.push({ type: "circle", key: `it-post-${id}`, cx: xb, cy, r: 4.5, cls: isAgr ? "dot dot--ink" : "dot dot--accent", opacity: op, tip: { title: `${f1(it.pre)} \u2192 ${f1(it.post)} (1\u20137)`, lines: [SHORT[id], "Before \u2192 after the plebiscite"] } });
      marks.push({ type: "text", key: `it-d-${id}`, x: w - P.r, y: cy + 4, anchor: "end", text: signed(r1(it.post) - r1(it.pre)), cls: isAgr ? "t-strong" : "t-strong", opacity: op });
    });
    if (mode === "concessions") {
      marks.push({ type: "text", key: "it-sec", x: P.l, y: top + rowH + gapAfterAgreement - 6, text: "Five concessions to FARC members", cls: "t-head halo" });
    } else {
      const e = est("agreement", "naive");
      const y = top + rowH + 18;
      marks.push({ type: "text", key: "it-est-1", x: P.l, y, text: `Difference: ${disp("est.agreement.naive")} standard deviations`, cls: "t-label" });
      marks.push({ type: "text", key: "it-est-2", x: P.l, y: y + 15, text: `(${disp("est.agreement.naive_lo")} to ${disp("est.agreement.naive_hi")}): not statistically significant`, cls: "t-note" });
    }
    return marks;
  }
  function estimatesChart(size) {
    const { w, h } = size;
    const SPEC = ["naive", "demo", "conf"];
    const panels = [{ key: "pp", title: "Percentage points", domain: [-10, 20], ticks: [-10, 0, 10, 20], k: 100, rows: [{ o: "negotiated", label: "Negotiated end with the FARC" }, { o: "bacrim", label: "Negotiated end with the Bacrim", placebo: true }] }, { key: "sd", title: "Standard deviations", domain: [-0.2, 0.4], ticks: [-0.2, 0, 0.2, 0.4], k: 1, rows: [{ o: "agreement", label: "Support for the signed agreement" }, { o: "concessions", label: "Concessions to FARC members" }, { o: "nonfarc", label: "Provisions unrelated to the FARC", placebo: true }] }];
    const marks = [];
    const rowH = clamp((h - 2 * 54) / 5, 34, 56);
    let y = 4;
    for (const p of panels) {
      const x = scaleLinear().domain(p.domain).range([P.l + 8, w - P.r - 8]);
      marks.push({ type: "text", key: `es-${p.key}-h`, x: P.l, y: y + 12, text: p.title, cls: "t-head" });
      const y0 = y + 20, y1 = y0 + p.rows.length * rowH;
      marks.push(...xAxisMarks({ key: `es-${p.key}`, scale: x, ticks: p.ticks, y0, y1, labelY: y1 + 13, format: (v) => v === 0 ? "0" : String(v).replace("-", "\u2212"), ref: 0 }));
      p.rows.forEach((row, i) => {
        const ry = y0 + i * rowH;
        const label = row.placebo ? `${row.label} \xB7 placebo` : row.label;
        marks.push({ type: "text", key: `es-${row.o}-l`, x: P.l, y: ry + 12, text: label, cls: row.placebo ? "t-strong halo" : "t-label halo" });
        SPEC.forEach((s, j) => {
          const e = est(row.o, s);
          const cy = ry + 20 + j * 6;
          const sig = e.lo > 0;
          marks.push({ type: "line", key: `es-${row.o}-${s}-ci`, x1: x(e.lo * p.k), x2: x(e.hi * p.k), y1: cy, y2: cy, cls: sig ? "range range--accent" : "range", opacity: j === 0 ? 1 : 0.6 });
          marks.push({ type: "circle", key: `es-${row.o}-${s}`, cx: x(e.est * p.k), cy, r: j === 0 ? 4 : 3, cls: sig ? "dot dot--accent" : "dot", opacity: j === 0 ? 1 : 0.7, tip: { title: `${signed(e.est * p.k, p.k === 100 ? 1 : 2)} [${f1(e.lo * p.k)}, ${f1(e.hi * p.k)}]`.replace("[", p.k === 100 ? "pp [" : "SD ["), lines: [row.label, ["Simple comparison", "+ demographic controls", "+ demographic and conflict controls"][j]] } });
        });
      });
      y = y1 + 34;
    }
    return marks;
  }
  const states = { quote(size) {
    const { w, h } = size;
    const fs = clamp(w / 13, 22, 40);
    const lines = wrap("The war in Colombia has ended.", w - P.l - P.r - 10, fs);
    const y0 = h * 0.36;
    const m = [{ type: "text", key: "q-mark", x: P.l, y: y0 - fs * 0.6, text: "\u201C", cls: "t-quote-mark" }];
    lines.forEach((ln, i) => m.push({ type: "text", key: `q-${i}`, x: P.l, y: y0 + i * fs * 1.15, cls: "t-quote", style: `font-size:${fs}px`, spans: i === lines.length - 1 ? [{ text: ln }, { text: "\u201D", cls: "t-quote-close" }] : [{ text: ln }] }));
    const yA = y0 + lines.length * fs * 1.15 + 12;
    m.push({ type: "text", key: "q-who", x: P.l, y: yA, text: "Juan Manuel Santos, President of Colombia", cls: "t-strong" });
    m.push({ type: "text", key: "q-where", x: P.l, y: yA + 16, text: `UN General Assembly, ${disp("event.un_date")}`, cls: "t-label" });
    return { marks: [...hiddenOnCalendar(size), ...m], caption: null, duration: 600 };
  }, ballot(size) {
    const { w, h } = size;
    const cw = Math.min(w - P.l - P.r, 420), x0 = P.l + (w - P.l - P.r - cw) / 2;
    const q = "Do you support the final agreement to end the conflict and build a stable and lasting peace?";
    const fs = 15, lines = wrap(q, cw - 36, fs);
    const ch = 70 + lines.length * 21 + 90, y0 = Math.max(10, (h - ch) / 2);
    const m = [{ type: "rect", key: "b-card", x: x0, y: y0, width: cw, height: ch, rx: 10, cls: "card" }, { type: "text", key: "b-h", x: x0 + 18, y: y0 + 30, text: `Plebiscite \xB7 ${disp("event.plebiscite_date")}, ${disp("event.year")}`, cls: "t-note" }];
    lines.forEach((ln, i) => m.push({ type: "text", key: `b-q-${i}`, x: x0 + 18, y: y0 + 60 + i * 21, text: ln, cls: "t-ballot" }));
    const yb = y0 + 60 + lines.length * 21 + 22;
    for (const [i, lab] of [["0", "Yes"], ["1", "No"]]) {
      const bx = x0 + 18 + +i * (cw / 2);
      m.push({ type: "rect", key: `b-box-${i}`, x: bx, y: yb, width: 34, height: 34, rx: 4, cls: "checkbox" });
      m.push({ type: "text", key: `b-lab-${i}`, x: bx + 46, y: yb + 23, text: lab, cls: "t-head" });
    }
    return { marks: [...hiddenOnCalendar(size), ...m], caption: { title: "One question on the ballot", note: ["Illustration"] }, duration: 600 };
  }, polls(size) {
    const { w, h } = size;
    const n = polls.length;
    const labelW = w < 480 ? 74 : 110;
    const x = scaleLinear().domain([0, 1]).range([P.l + labelW, w - P.r - 4]);
    const rowH = clamp((h - 50) / n, 18, 34), t = Math.min(rowH - 5, 22);
    const m = [];
    const y50 = 14;
    m.push({ type: "line", key: "pl-50", x1: x(0.5), x2: x(0.5), y1: y50, y2: y50 + 10 + n * rowH, cls: "ref" });
    m.push({ type: "text", key: "pl-50-l", x: x(0.5), y: y50 + 2, anchor: "middle", text: "50%", cls: "t-note" });
    polls.forEach((p, i) => {
      const y = y50 + 14 + i * rowH + t / 2;
      const date = (/* @__PURE__ */ new Date(p.date + "T12:00:00Z")).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      m.push({ type: "text", key: `pl-l-${i}`, x: P.l, y: y + 4, text: `${p.pollster} \xB7 ${date}`, cls: "t-label" });
      const xs = [x(0), x(p.yes), x(p.yes + p.no), x(1)];
      m.push({ type: "rect", key: `pl-y-${i}`, x: xs[0], y: y - t / 2, width: xs[1] - xs[0] - 1, height: t, cls: "bar-ink", enter: { width: 0 }, delay: i * 50 });
      m.push({ type: "rect", key: `pl-n-${i}`, x: xs[1] + 1, y: y - t / 2, width: Math.max(0, xs[2] - xs[1] - 2), height: t, cls: "bar-mid", delay: i * 50 });
      if (p.dk_nr > 0) m.push({ type: "rect", key: `pl-d-${i}`, x: xs[2] + 1, y: y - t / 2, width: Math.max(0, xs[3] - xs[2] - 1), height: t, cls: "bar-track", delay: i * 50 });
      m.push({ type: "text", key: `pl-v-${i}`, x: xs[0] + 6, y: y + 4, text: `${Math.round(p.yes * 100)}%`, cls: "t-onbar", delay: i * 50 });
    });
    wrap("Pollsters: IG Invamer Gallup, C&C Cifras & Conceptos, DAT Datexco, INF Ipsos Napole\xF3n Franco", w - P.l - P.r, 10.5).forEach((ln, k) => m.push({ type: "text", key: `pl-note-${k}`, x: P.l, y: y50 + 14 + n * rowH + 18 + k * 13, text: ln, cls: "t-note" }));
    return { marks: [...hiddenOnCalendar(size), ...m], duration: 700, caption: { title: `Every poll had Yes ahead`, note: [{ swatch: "dot key-dot--ink", text: "Yes" }, { swatch: "dot", text: "No" }, { swatch: "dot key-dot--faint", text: "Don\u2019t know" }] } };
  }, result(size) {
    const { w, h } = size;
    const x = scaleLinear().domain([0, 100]).range([P.l, w - P.r]);
    const y = h * 0.5, t = 34;
    const no = val("event.no_share");
    const fs = clamp(w / 9, 30, 56);
    const m = [{ type: "text", key: "r-no-l", x: P.l, y: y - t / 2 - 14 - fs - 4, text: "No", cls: "t-head" }, { type: "text", key: "r-no", x: P.l, y: y - t / 2 - 14, text: disp("event.no_share"), cls: "t-big", style: `font-size:${fs}px` }, { type: "text", key: "r-yes-l", x: w - P.r, y: y - t / 2 - 14 - fs - 4, anchor: "end", text: "Yes", cls: "t-head" }, { type: "text", key: "r-yes", x: w - P.r, y: y - t / 2 - 14, anchor: "end", text: disp("event.yes_share"), cls: "t-big t-big--muted", style: `font-size:${fs}px` }, { type: "rect", key: "r-bar-no", x: x(0), y: y - t / 2, width: x(no) - x(0) - 1, height: t, cls: "bar-ink", enter: { width: 0 } }, { type: "rect", key: "r-bar-yes", x: x(no) + 1, y: y - t / 2, width: x(100) - x(no) - 1, height: t, cls: "bar-mid" }, { type: "line", key: "r-50", x1: x(50), x2: x(50), y1: y - t / 2 - 8, y2: y + t / 2 + 8, cls: "ref" }, { type: "text", key: "r-50-l", x: x(50), y: y + t / 2 + 22, anchor: "middle", text: "50%", cls: "t-note" }, { type: "text", key: "r-margin", x: P.l, y: y + t / 2 + 50, text: `A margin of ${disp("event.margin")} votes`, cls: "t-strong t-accent-fill" }];
    return { marks: [...hiddenOnCalendar(size), ...m], duration: 700, caption: { title: `The result, ${disp("event.plebiscite_date")}, ${disp("event.year")}`, note: ["Share of valid votes"] } };
  }, fieldwork(size) {
    const C = calendarLayout(size);
    return { marks: [...calendarAxis(C, size), ...dots(C.pos, C.r, () => ({ cls: "dot--ink2" }), { stagger: 1.2 })], duration: 900, caption: { title: `${disp("sample.n")} interviews, one dot each`, note: ["AmericasBarometer Colombia, by interview date"] } };
  }, split(size) {
    const C = calendarLayout(size);
    const xs = C.xDay(SPLIT_DAY);
    return { marks: [...calendarAxis(C, size), { type: "line", key: "cal-split", x1: xs, x2: xs, y1: C.top - 18, y2: C.base + 1, cls: "ref", enter: { y1: C.base } }, { type: "text", key: "cal-split-l", x: xs - 4, y: C.top - 8, anchor: "end", text: `Plebiscite, ${disp("event.plebiscite_date")}`, cls: "t-strong halo" }, { type: "text", key: "cal-pre-l", x: P.l, y: C.top - 8, text: `${disp("sample.pre")} before`, cls: "t-strong halo" }, { type: "text", key: "cal-post-l", x: xs + 4, y: C.top + 8, text: `${disp("sample.post")} after`, cls: "t-strong halo t-accent-label" }, ...dots(C.pos, C.r, (d) => ({ cls: d.post ? "dot--accent" : "dot--ink2", opacity: d.post ? 1 : 0.55 }))], duration: 700, caption: { title: "The vote splits the survey in two", note: [{ swatch: "dot", text: "interviewed before" }, { swatch: "dot key-dot--accent", text: "interviewed after" }] } };
  }, agreement(size) {
    return { marks: [...hiddenInBlocks(size), ...itemsChart(size, "agreement")], duration: 700, caption: { title: "Support for the signed agreement barely moved", note: [{ swatch: "dot", text: "before the vote" }, { swatch: "dot key-dot--ink", text: "after" }, "Average on a 1\u20137 scale"] } };
  }, "before-after"(size) {
    return blocksState(size, false);
  }, "before-after-final"(size) {
    return blocksState(size, true);
  }, concessions(size) {
    return { marks: [...hiddenInBlocks(size), ...itemsChart(size, "concessions")], duration: 700, caption: { title: "Every concession gained support", note: [{ swatch: "dot", text: "before the vote" }, { swatch: "dot key-dot--accent", text: "after" }, "Average on a 1\u20137 scale"] } };
  }, placebos(size) {
    return { marks: [...hiddenInBlocks(size), ...estimatesChart(size)], duration: 700, caption: { title: "What changed, and what didn\u2019t", note: [{ swatch: "dot key-dot--accent", text: "clear change" }, { swatch: "dot", text: "no clear change" }, "Three model versions per outcome, 95% intervals"] } };
  }, checks(size) {
    const { w, h } = size;
    const rows = ["Placebo \u201Cevents\u201D on earlier dates: no jump", `Windows of \xB1${disp("robust.bw_narrow")} and \xB1${disp("robust.bw_wide")} days around the vote: similar estimates`, `Leaving out each of the ${disp("robust.regions")} regions: similar estimates`, `Same time of year in ${disp("robust.prior_year")}: no significant change`];
    const fs = 14;
    const m = [];
    let y = Math.max(20, h * 0.18);
    rows.forEach((t, i) => {
      const lines = wrap(t, w - P.l - P.r - 40, fs);
      m.push({ type: "circle", key: `ck-c-${i}`, cx: P.l + 11, cy: y - 4, r: 11, cls: "dot dot--accent", delay: i * 120 });
      m.push({ type: "path", key: `ck-v-${i}`, d: `M${P.l + 6},${y - 4}L${P.l + 10},${y}L${P.l + 17},${y - 9}`, cls: "checkmark", z: 3, delay: i * 120 });
      lines.forEach((ln, k) => m.push({ type: "text", key: `ck-t-${i}-${k}`, x: P.l + 32, y: y + k * 19, text: ln, cls: "t-ballot", delay: i * 120 }));
      y += lines.length * 19 + 26;
    });
    return { marks: [...hiddenInBlocks(size), ...m], duration: 600, caption: { title: "Robustness checks", note: ["Details in the paper\u2019s appendix"] } };
  }, "checks-more"(size) {
    const { w, h } = size;
    const chips = ["No jump on placebo dates", `\xB1${disp("robust.bw_narrow")}- and \xB1${disp("robust.bw_wide")}-day windows`, `Leave out each of ${disp("robust.regions")} regions`, `No significant change in ${disp("robust.prior_year")}`, "Every poll predicted Yes", `Searches peaked on ${disp("check.search_peak")}`, "Groups balanced, except conflict zones", "Holds with demographic controls", "Holds with conflict controls", "Similar \u201Cdon\u2019t know\u201D rates", "No trend before the vote", "Bacrim: no change", "Non-FARC provisions: no change", `\u201CThe peace\u201D as top problem: ${disp("check.problem_pre")} \u2192 ${disp("check.problem_post")}`, "Only regions surveyed before and after", "Without conflict-zone towns", "Latent concession measure", "Each concession on its own"];
    const maxW = w - P.l - P.r;
    let fs, ch, gap, placed, totalH;
    for (fs = 12; fs >= 9; fs -= 0.5) {
      ch = Math.round(fs * 2.3);
      gap = Math.round(fs * 0.55);
      placed = [];
      let x = P.l, y = 0;
      for (const text of chips) {
        const cw = Math.min(maxW, text.length * fs * 0.56 + fs * 3.2);
        if (x + cw > P.l + maxW) {
          x = P.l;
          y += ch + gap;
        }
        placed.push({ text, x, y, cw });
        x += cw + gap;
      }
      totalH = y + ch;
      if (totalH <= h - 10) break;
    }
    const y0 = Math.max(10, (h - totalH) / 2);
    const m = [];
    placed.forEach((c, i) => {
      const cy = y0 + c.y + ch / 2, d = 120 + i * 110;
      m.push({ type: "rect", key: `chip-${i}`, x: c.x, y: y0 + c.y, width: c.cw, height: ch, rx: ch / 2, cls: "chip", delay: d });
      const k = fs / 12;
      m.push({ type: "circle", key: `chip-${i}-c`, cx: c.x + 14 * k, cy, r: 8 * k, cls: "dot dot--accent", delay: d });
      m.push({ type: "path", key: `chip-${i}-v`, d: `M${c.x + 10.5 * k},${cy}L${c.x + 13 * k},${cy + 2.6 * k}L${c.x + 17.8 * k},${cy - 3 * k}`, cls: "checkmark checkmark--small", z: 3, delay: d });
      m.push({ type: "text", key: `chip-${i}-t`, x: c.x + 28 * k, y: cy + fs * 0.35, text: c.text, cls: "t-label", style: `font-size:${fs}px`, delay: d });
    });
    return { marks: [...hiddenInBlocks(size), ...m], duration: 450, caption: { title: "\u2026and many more", note: ["From the paper\u2019s appendix"] } };
  }, march(size) {
    return { marks: hiddenInBlocks(size), caption: { title: "Bogot\xE1, three days after the vote" }, duration: 500 };
  }, after(size) {
    const { w, h } = size;
    const events = [{ k: "e1", date: disp("event.plebiscite_date"), text: "The No wins the plebiscite" }, { k: "e2", date: disp("event.revised_date"), text: "A revised agreement is signed" }, { k: "e3", date: "Later that week", text: "Congress ratifies it, without a second popular vote" }];
    const x0 = P.l + 10, y0 = Math.max(24, h * 0.2), step = clamp(h * 0.2, 70, 120);
    const m = [{ type: "line", key: "tl-line", x1: x0, x2: x0, y1: y0, y2: y0 + step * (events.length - 1), cls: "ref-soft" }];
    events.forEach((e, i) => {
      const y = y0 + i * step;
      m.push({ type: "circle", key: `tl-${e.k}`, cx: x0, cy: y, r: 7, cls: i === 0 ? "dot dot--ink" : "dot dot--accent", delay: i * 150 });
      m.push({ type: "text", key: `tl-${e.k}-d`, x: x0 + 20, y: y - 4, text: e.date, cls: "t-head", delay: i * 150 });
      wrap(e.text, w - x0 - 30, 13).forEach((ln, k) => m.push({ type: "text", key: `tl-${e.k}-t${k}`, x: x0 + 20, y: y + 14 + k * 16, text: ln, cls: "t-label", delay: i * 150 }));
    });
    return { marks: [...hiddenInBlocks(size), ...m], duration: 600, caption: { title: `What happened next, ${disp("event.year")}` } };
  } };
  function blocksState(size, final) {
    const B = blocksLayout(size);
    const share = (post) => {
      const g = respondents.filter((d) => !!d.post === post && d.answer !== "no answer");
      return g.filter((d) => d.answer === "negotiation").length / g.length;
    };
    const m = [];
    const groups = [{ k: "pre", b: B.pre, label: `Before the vote \xB7 ${disp("sample.pre")} people`, s: share(false), lab: disp("table1.negotiated.pre") }, { k: "post", b: B.post, label: `After the vote \xB7 ${disp("sample.post")} people`, s: share(true), lab: disp("table1.negotiated.post") }];
    for (const g of groups) {
      m.push({ type: "text", key: `bl-${g.k}-h`, x: g.b.x0, y: g.b.y0 - 8, text: g.label, cls: "t-strong" });
      const by = g.b.bottom + 16, t = 12;
      m.push({ type: "path", key: `bl-${g.k}-track`, d: hbarPath(g.b.x0, g.b.x0 + B.blockW, by, t, 0), cls: "bar-mid" });
      m.push({ type: "path", key: `bl-${g.k}-bar`, d: hbarPath(g.b.x0, g.b.x0 + g.s * B.blockW, by, t, 0), enter: { d: hbarPath(g.b.x0, g.b.x0, by, t, 0) }, cls: "bar-accent" });
      m.push({ type: "text", key: `bl-${g.k}-v`, x: g.b.x0, y: by + t / 2 + 15, text: `${g.lab} chose negotiation`, cls: final ? "t-head" : "t-strong" });
    }
    return { marks: [...m, ...dots(B.pos, B.r, (d) => ({ cls: answerCls(d), opacity: final && d.answer !== "negotiation" ? 0.35 : 1 }), { stagger: final ? 0 : 0.8 })], duration: final ? 600 : 1300, caption: { title: "Best way to end the conflict with the FARC", note: [{ swatch: "dot key-dot--accent", text: "negotiation" }, { swatch: "dot", text: "military force, or both" }, { swatch: "dot key-dot--faint", text: "no answer" }] } };
  }
  return { state(name, size) {
    const fn = states[name];
    if (!fn) throw new Error(`unknown graphic state "${name}"`);
    return fn(size);
  } };
}
function buildPhoto(layer) {
  const fig = document.createElement("figure");
  fig.className = "co-photo";
  fig.dataset.states = "march";
  const img = document.createElement("img");
  img.src = "assets/march-1000.jpg";
  img.srcset = "assets/march-640.jpg 640w, assets/march-1000.jpg 1000w, assets/march-1400.jpg 1400w";
  img.sizes = "(min-width: 768px) 55vw, 100vw";
  img.loading = "lazy";
  img.decoding = "async";
  img.alt = "At a night march for peace in Bogot\xE1, a woman holds a candle and a woman beside her holds a handmade banner reading PAZ, peace.";
  const cap = document.createElement("figcaption");
  const a = document.createElement("a");
  a.href = "https://commons.wikimedia.org/wiki/File:Marcha_por_la_paz_2016_(6).jpg";
  a.textContent = "Photo: MAFAPO \u2013 Madres de Falsos Positivos de Soacha y Bogot\xE1";
  const lic = document.createElement("a");
  lic.href = "https://creativecommons.org/licenses/by-sa/4.0";
  lic.textContent = "CC BY-SA 4.0";
  cap.append("Peace march in Plaza de Bol\xEDvar, Bogot\xE1, October 5, 2016. ", a, ", ", lic);
  fig.append(img, cap);
  layer.appendChild(fig);
}
