import { scaleLinear, scaleLog } from "../../engine/vendor/d3.js";
import { dodge, fitSwarm } from "../../engine/charts/beeswarm.js";
import { xAxisMarks } from "../../engine/charts/axes.js";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const minus = (s) => String(s).replace("-", "\u2212");
const f2 = (v) => minus(v.toFixed(2));
export const PCT_TICKS = [0, 3, 6, 9, 12];
export const LOGODDS_TICKS = [-3, -2, -1, 0, 1, 2, 3];
export const TIME_TICKS = [1, 10, 100, 1e3];
export const LOOKUP_BINS = [[1, 1], [2, 2], [3, 3], [4, 5], [6, 10], [11, 20], [21, Infinity]];
const binLabel = ([a, b]) => a === b ? String(a) : b === Infinity ? `${a}+` : `${a}\u2013${b}`;
const TYPES = ["verbal", "factual", "visual", "event"];
const TYPE_NAME = { verbal: "Candidate names", factual: "Election rules", visual: "Politician photos", event: "Recent events" };
const TYPE_KEY = { verbal: "items.verbal", factual: "items.factual", visual: "items.visual", event: "items.event" };
const CHANCELLOR = "know_chancellorelection.2";
const MODEL_ROWS = ["educ_catHigh", "educ_catIntermediate", "resc.internal_efficacy", "resc.resp_prop_correct_wo_cheating", "genderFemale", "resc.age.2", "twohoursweek1", "resc.ques_prop_correct"];
const MODEL_ACCENT = /* @__PURE__ */ new Set(["resc.internal_efficacy", "resc.resp_prop_correct_wo_cheating"]);
function shuffled(n, seed) {
  const a = Array.from({ length: n }, (_, i) => i);
  let s = seed;
  const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export default function createGraphic({ data, htmlLayer }) {
  const { respondents, items, model, ztests, times, numbers } = data;
  const N = (k) => {
    const v = numbers.values[k];
    if (!v) throw new Error(`numbers.json has no key ${k}`);
    return v;
  };
  const disp = (k) => N(k).display;
  const val = (k) => N(k).value;
  const modelBy = Object.fromEntries(model.map((m) => [m.term, m]));
  buildLog(htmlLayer);
  function grid(n, { w, h }, top = 8) {
    const H = h - top - 8;
    const cols = Math.ceil(Math.sqrt(n * w / H));
    const rows = Math.ceil(n / cols);
    const cell = Math.min(w / cols, H / rows);
    const x0 = (w - cols * cell) / 2;
    return { cell, r: Math.min(cell * 0.38, 7), at: (i) => ({ x: x0 + (i % cols + 0.5) * cell, y: top + (Math.floor(i / cols) + 0.5) * cell }) };
  }
  const ORDER_DE = shuffled(respondents.length, 2017);
  const SLOT_DE = new Array(respondents.length);
  ORDER_DE.forEach((ri, slot) => {
    SLOT_DE[ri] = slot;
  });
  function germanGrid(size) {
    const G = grid(respondents.length, size);
    return { ...G, pos: respondents.map((_, i) => G.at(SLOT_DE[i])) };
  }
  function histLayout(size) {
    const G = germanGrid(size);
    const r = G.r, cell = 2 * r + 2;
    const padL = 4, padR = 4, base = size.h - 40;
    const colW = (size.w - padL - padR) / LOOKUP_BINS.length;
    const per = Math.max(1, Math.floor((colW - 6) / cell));
    const pos = G.pos.slice();
    const counts = LOOKUP_BINS.map(() => 0);
    respondents.forEach((p, i) => {
      if (p.k === 0) return;
      const b = LOOKUP_BINS.findIndex(([a, z]) => p.k >= a && p.k <= z);
      const j = counts[b]++;
      const cx = padL + b * colW + colW / 2 + (j % per - (per - 1) / 2) * cell;
      pos[i] = { x: cx, y: base - r - Math.floor(j / per) * cell };
    });
    const tops = counts.map((c) => base - Math.ceil(c / per) * cell);
    return { ...G, pos, colW, padL, base, counts, tops };
  }
  function pctScale({ w }) {
    return scaleLinear().domain([0, 13]).range([10, w - 12]);
  }
  function itemSwarm(size) {
    const x = pctScale(size);
    const axisY = size.h - 34;
    const cy = axisY * 0.55;
    const { r, ys } = fitSwarm(items.map((d) => x(d.pct)), { rMax: clamp(size.w / 60, 4.5, 7), halfHeight: axisY * 0.4 });
    return { x, r, axisY, pos: new Map(items.map((d, i) => [d.id, { x: x(d.pct), y: cy + ys[i] }])) };
  }
  function typeRows(size) {
    const S = itemSwarm(size);
    const r = S.r;
    const swarms = TYPES.map((t) => {
      const list = items.filter((d) => d.type === t);
      const ys = dodge(list.map((d) => S.x(d.pct)), r);
      const ext = Math.max(...ys.map(Math.abs)) + r;
      return { t, list, ys, ext, below: list.some((d) => d.id === CHANCELLOR) ? 16 : 0 };
    });
    const labelH = 18, gap = 8;
    const fixed = swarms.reduce((s, q) => s + labelH + gap + q.below, 0);
    const need = swarms.reduce((s, q) => s + 2 * q.ext, 0);
    const k = Math.min(1, (S.axisY - 4 - fixed) / need);
    let y = 4;
    const pos = /* @__PURE__ */ new Map();
    const rows = swarms.map((q) => {
      const labelY = y + 12;
      const cy = y + labelH + q.ext * k;
      q.list.forEach((d, j) => pos.set(d.id, { x: S.x(d.pct), y: cy + q.ys[j] * k }));
      y = cy + q.ext * k + gap + q.below;
      return { t: q.t, labelY, cy };
    });
    return { ...S, pos, rows };
  }
  function unit(key, x, y, r, { sq = false, cls = "", opacity = 1, delay = 0 } = {}) {
    const half = sq ? r * 0.92 : r;
    return { type: "rect", key, x: x - half, y: y - half, width: 2 * half, height: 2 * half, rx: sq ? 1.5 : half, z: 2, cls: `dot ${cls}`.trim(), opacity, delay };
  }
  function germanDots(pos, r, style = () => ({})) {
    return respondents.map((p, i) => unit(`de-${i}`, pos[i].x, pos[i].y, r, style(p, i)));
  }
  const hideGerman = (size) => {
    const G = germanGrid(size);
    return germanDots(G.pos, G.r, () => ({ opacity: 0 }));
  };
  function itemDots(pos, r, style = () => ({})) {
    return items.map((d, i) => {
      const p = pos.get(d.id), s = style(d);
      return { type: "circle", key: `it-${d.id}`, cx: p.x, cy: p.y, r, cls: `dot ${s.cls || ""}`.trim(), opacity: s.opacity ?? 1, delay: i % 20 * 12, tip: { title: `${d.pct.toFixed(1)}% of answers looked up`, lines: [d.text, `${TYPE_NAME[d.type]} \xB7 wave ${d.wave}`, `${d.k} of ${d.n} answers`] } };
    });
  }
  function pctAxis(L, size, opacity = 1) {
    return [...xAxisMarks({ key: "pct", scale: L.x, ticks: PCT_TICKS, y0: 0, y1: L.axisY, labelY: L.axisY + 15, format: (v) => `${v}%`, opacity }), { type: "text", key: "pct-title", x: size.w - 12, y: L.axisY + 30, anchor: "end", text: "share of answers looked up \u2192", cls: "t-note", opacity }];
  }
  function typeMarks(size, emphasize) {
    const L = typeRows(size);
    const chp = L.pos.get(CHANCELLOR);
    const dim = (t) => emphasize && t !== emphasize ? 0.3 : 1;
    return [...pctAxis(L, size), ...L.rows.map((row) => ({ type: "text", key: `row-${row.t}`, x: 10, y: row.labelY, cls: "t-strong halo", opacity: dim(row.t), spans: [{ text: TYPE_NAME[row.t] }, { text: ` \xB7 average ${disp(TYPE_KEY[row.t])}`, cls: "t-label" }] })), ...itemDots(L.pos, L.r, (d) => ({ cls: d.id === CHANCELLOR && !emphasize ? "dot--accent" : "", opacity: dim(d.type) })), { type: "text", key: "chancellor", x: chp.x + L.r, y: chp.y + L.r + 13, anchor: "end", cls: "t-label halo", text: `Who elects the chancellor? ${disp("items.max")}`, opacity: emphasize ? 0 : 1 }];
  }
  const states = { log(size) {
    return { marks: hideGerman(size), caption: { title: "One survey session, as the tracker logged it", note: ["Illustration, not data"] } };
  }, "log-flag"(size) {
    return { marks: hideGerman(size), caption: { title: "Flag by keyword, then check by hand", note: ["Illustration, not data"] } };
  }, grid(size) {
    const G = germanGrid(size);
    return { marks: germanDots(G.pos, G.r, (p, i) => ({ delay: SLOT_DE[i] % 40 * 8 })), duration: 700, caption: { title: `The ${disp("sample.n")} respondents`, note: [{ swatch: "dot", text: "one respondent" }] } };
  }, "grid-lit"(size) {
    const G = germanGrid(size);
    return { marks: germanDots(G.pos, G.r, (p) => p.k > 0 ? { sq: true, cls: "dot--accent" } : { cls: "dot--faint" }), duration: 600, caption: { title: `${disp("prev.any")} looked up at least one answer`, note: [{ swatch: "sq", text: "looked something up" }, { swatch: "dot key-dot--faint", text: "never" }] } };
  }, histogram(size) {
    const L = histLayout(size);
    return { marks: [...germanDots(L.pos, L.r, (p, i) => p.k > 0 ? { sq: true, cls: "dot--accent", delay: i % 30 * 10 } : { opacity: 0 }), ...LOOKUP_BINS.flatMap((b, j) => {
      const x = L.padL + j * L.colW + L.colW / 2;
      return [{ type: "text", key: `bin-${j}`, x, y: L.base + 16, anchor: "middle", text: binLabel(b), cls: "t-tick" }, { type: "text", key: `binn-${j}`, x, y: L.tops[j] - 6, anchor: "middle", text: String(L.counts[j]), cls: "t-label" }];
    }), { type: "line", key: "hist-base", x1: 4, x2: size.w - 4, y1: L.base + 2, y2: L.base + 2, cls: "ref-soft" }, { type: "text", key: "hist-title", x: size.w - 4, y: L.base + 32, anchor: "end", text: "number of answers looked up \u2192", cls: "t-note" }], duration: 1100, caption: { title: "Most cheaters looked up one or two answers", note: [{ swatch: "sq", text: "one person who looked something up" }] } };
  }, tabs(size) {
    const bw = size.w - 8, x0 = 4, top = size.h * 0.22, gapY = Math.min(110, size.h * 0.26);
    const rows = [{ key: "browse", label: "Visited another website", v: val("browse.any"), d: disp("browse.any"), cls: "bar-fill" }, { key: "cheat", label: "Looked up an answer", v: val("prev.any"), d: disp("prev.any"), cls: "bar-fill--accent" }];
    return { marks: [...hideGerman(size), ...rows.flatMap((r, i) => {
      const y = top + i * gapY;
      return [{ type: "text", key: `tab-l-${r.key}`, x: x0, y: y - 10, text: r.label, cls: "t-strong" }, { type: "text", key: `tab-v-${r.key}`, x: x0 + bw, y: y - 10, anchor: "end", text: r.d, cls: "t-strong" }, { type: "rect", key: `tab-t-${r.key}`, x: x0, y, width: bw, height: 22, rx: 4, cls: "bar-track" }, { type: "rect", key: `tab-f-${r.key}`, x: x0, y, width: bw * r.v / 100, height: 22, rx: 4, cls: r.cls, enter: { width: 0 } }];
    })], duration: 900, caption: { title: "Another tab is not the same as cheating", note: ["Share of respondents in the German panel"] } };
  }, items(size) {
    const L = itemSwarm(size);
    return { marks: [...hideGerman(size), ...pctAxis(L, size), ...itemDots(L.pos, L.r)], duration: 1e3, caption: { title: `The ${disp("sample.items")} items`, note: [{ swatch: "dot", text: "one item" }] } };
  }, types(size) {
    return { marks: [...hideGerman(size), ...typeMarks(size)], duration: 1e3, caption: { title: "Typed answers get \u201Cgoogled\u201D most", note: [{ swatch: "dot", text: "one item" }, { swatch: "dot key-dot--accent", text: "most looked up" }] } };
  }, "types-end"(size) {
    return { marks: [...hideGerman(size), ...typeMarks(size, "visual")], duration: 1e3, caption: { title: "Photos are hard to \u201Cgoogle\u201D", note: [{ swatch: "dot", text: "one item" }] } };
  }, us(size) {
    const n = val("us.n"), k = val("us.cheaters");
    const G = grid(n, size);
    const lit = new Set(shuffled(n, 2018).slice(0, k));
    return { marks: Array.from({ length: n }, (_, i) => {
      const p = G.at(i);
      return unit(`us-${i}`, p.x, p.y, G.r, lit.has(i) ? { sq: true, cls: "dot--accent" } : { cls: "dot--faint", delay: i % 40 * 8 });
    }), duration: 700, caption: { title: `The US survey: ${disp("us.cheaters")} of ${disp("us.n")}`, note: [{ swatch: "sq", text: "looked something up" }, { swatch: "dot key-dot--faint", text: "never" }] } };
  }, predictors(size) {
    const rows = MODEL_ROWS.map((t) => modelBy[t]);
    const x = scaleLinear().domain([-3.4, 3.4]).range([8, size.w - 8]);
    const top = 6, axisY = size.h - 38;
    const rowH = (axisY - top) / rows.length;
    return { marks: [...xAxisMarks({ key: "lo", scale: x, ticks: LOGODDS_TICKS, y0: top, y1: axisY, labelY: axisY + 15, format: (v) => minus(v), ref: 0 }), { type: "text", key: "lo-left", x: 8, y: axisY + 30, text: "\u2190 less likely to cheat", cls: "t-note" }, { type: "text", key: "lo-right", x: size.w - 8, y: axisY + 30, anchor: "end", text: "more likely \u2192", cls: "t-note" }, ...rows.flatMap((m, i) => {
      const y = top + i * rowH + rowH * 0.68;
      const acc = MODEL_ACCENT.has(m.term);
      const tip = { title: `${f2(m.est)} [${f2(m.lo95)}, ${f2(m.hi95)}]`, lines: [m.label, "log odds, 95% interval"] };
      return [{ type: "text", key: `m-l-${m.term}`, x: 8, y: y - 10, text: m.label, cls: acc ? "t-strong halo" : "t-label halo" }, { type: "line", key: `m-95-${m.term}`, x1: x(m.lo95), x2: x(m.hi95), y1: y, y2: y, cls: `ci ${acc ? "ci--accent" : ""}`.trim(), enter: { x1: x(m.est), x2: x(m.est) } }, { type: "line", key: `m-80-${m.term}`, x1: x(m.lo80), x2: x(m.hi80), y1: y, y2: y, cls: `ci ci--80 ${acc ? "ci--accent" : ""}`.trim(), enter: { x1: x(m.est), x2: x(m.est) } }, { type: "circle", key: `m-d-${m.term}`, cx: x(m.est), cy: y, r: 5.5, cls: `dot ${acc ? "dot--accent" : "dot--ink"}`, tip, delay: i * 50 }];
    })], duration: 900, caption: { title: "Feeling informed vs. being informed", note: [{ swatch: "dot key-dot--ink", text: "estimate" }, "thick line: 80% interval; thin: 95%"] } };
  }, times(size) {
    const x = scaleLog().domain([1, 3e3]).range([8, size.w - 8]);
    const axisY = size.h - 40, top = 46;
    const ymax = Math.max(...times.honest.share, ...times.cheated.share);
    const y = scaleLinear().domain([0, ymax]).range([axisY, top]);
    const br = times.breaks;
    const area = (sh) => {
      const pts = sh.map((v, i) => [x(Math.sqrt(br[i] * br[i + 1])), y(v)]);
      return `M${x(br[0])},${axisY}` + pts.map(([a, b]) => `L${a.toFixed(1)},${b.toFixed(1)}`).join("") + `L${x(br[br.length - 1])},${axisY}Z`;
    };
    const flat = (sh) => `M${x(br[0])},${axisY}` + sh.map((_, i) => `L${x(Math.sqrt(br[i] * br[i + 1])).toFixed(1)},${axisY}`).join("") + `L${x(br[br.length - 1])},${axisY}Z`;
    const med = [{ key: "honest", v: times.honest.median, d: disp("timing.honest"), anchor: "end", dx: -5, row: 1 }, { key: "cheated", v: times.cheated.median, d: disp("timing.cheated"), anchor: "start", dx: 5, row: 0 }];
    return { marks: [...xAxisMarks({ key: "t", scale: x, ticks: TIME_TICKS, y0: 8, y1: axisY, labelY: axisY + 15, format: (v) => `${v} s` }), { type: "text", key: "t-title", x: size.w - 8, y: axisY + 30, anchor: "end", text: "time spent on the question (log scale) \u2192", cls: "t-note" }, { type: "path", key: "dens-honest", d: area(times.honest.share), enter: { d: flat(times.honest.share) }, cls: "dens" }, { type: "path", key: "dens-cheated", d: area(times.cheated.share), enter: { d: flat(times.cheated.share) }, cls: "dens dens--accent" }, ...med.flatMap((m) => [{ type: "line", key: `med-${m.key}`, x1: x(m.v), x2: x(m.v), y1: 12 + m.row * 18, y2: axisY, cls: "ref" }, { type: "text", key: `med-l-${m.key}`, x: x(m.v) + m.dx, y: 20 + m.row * 18, anchor: m.anchor, text: `median ${m.d}`, cls: "t-strong halo" }])], duration: 900, caption: { title: "Looked-up answers take longer, but overlap", note: [{ swatch: "dot", text: "answered alone" }, { swatch: "dot key-dot--accent", text: "looked up" }] } };
  }, ztests(size) {
    const x = scaleLinear().domain([-2.6, 2.6]).range([8, size.w - 8]);
    const axisY = size.h - 40, top = 14;
    const unit2 = x(1) - x(0);
    let r = 3.4, cell, bins;
    for (; r > 1.6; r -= 0.2) {
      cell = 2 * r + 0.8;
      bins = /* @__PURE__ */ new Map();
      ztests.forEach((d, i) => {
        const b = Math.round(d.z / (cell / unit2));
        if (!bins.has(b)) bins.set(b, []);
        bins.get(b).push(i);
      });
      const maxc = Math.max(...[...bins.values()].map((v) => v.length));
      if (maxc * cell <= axisY - top - 10) break;
    }
    const bw = cell / unit2;
    const pos = new Array(ztests.length);
    for (const [b, list] of bins) list.forEach((i, j) => {
      pos[i] = { x: x(b * bw), y: axisY - r - 1 - j * cell };
    });
    const zc = val("distort.z");
    return { marks: [{ type: "rect", key: "z-band", x: x(-zc), y: top, width: x(zc) - x(-zc), height: axisY - top, cls: "band-accent", z: 0 }, ...xAxisMarks({ key: "z", scale: x, ticks: [-zc, 0, zc], y0: top, y1: axisY, labelY: axisY + 15, format: (v) => v === 0 ? "0" : `${v < 0 ? "\u2212" : ""}${disp("distort.z")}`, ref: 0 }), { type: "text", key: "z-title", x: size.w - 8, y: axisY + 30, anchor: "end", text: "raw vs. corrected (z-score) \u2192", cls: "t-note" }, ...ztests.map((d, i) => ({ type: "circle", key: `z-${i}`, cx: pos[i].x, cy: pos[i].y, r, cls: "dot", delay: i % 40 * 10, enter: { cy: axisY - r - 1 }, tip: { title: `z = ${f2(d.z)}`, lines: [`${d.covariate}, ${d.measure} knowledge`] } }))], duration: 1e3, caption: { title: "Correcting for cheating doesn\u2019t move the estimates", note: [{ swatch: "dot", text: "one coefficient compared" }, `shaded: within \xB1${disp("distort.z")}`] } };
  } };
  return { state(name, size) {
    const fn = states[name];
    if (!fn) throw new Error(`unknown graphic state "${name}" (add it to charts/graphic.js)`);
    return fn(size);
  } };
}
function buildLog(layer) {
  const el = document.createElement("div");
  el.className = "ch-log";
  el.dataset.states = "log log-flag";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <ol class="ch-log__list">
      <li class="ch-log__row ch-log__edge"><span class="ch-log__dot"></span><span>Survey starts</span></li>
      <li class="ch-log__row"><span class="ch-log__dot"></span><span class="ch-log__site">facebook.com</span></li>
      <li class="ch-log__row"><span class="ch-log__dot"></span><span class="ch-log__site">mail.google.com</span></li>
      <li class="ch-log__row is-hit"><span class="ch-log__dot"></span><span><span class="ch-log__site">google.de</span>
        <span class="ch-log__what">search: <span lang="de">wer w\xE4hlt den <mark>bundeskanzler</mark></span></span>
        <span class="ch-log__verdict">\u2713 checked by hand: a lookup</span></span></li>
      <li class="ch-log__row"><span class="ch-log__dot"></span><span><span class="ch-log__site">news site</span>
        <span class="ch-log__what">an article about the <mark>FDP</mark></span>
        <span class="ch-log__verdict">\u2717 checked by hand: not a lookup</span></span></li>
      <li class="ch-log__row"><span class="ch-log__dot"></span><span class="ch-log__site">amazon.de</span></li>
      <li class="ch-log__row ch-log__edge"><span class="ch-log__dot"></span><span>Survey ends</span></li>
    </ol>`;
  layer.append(el);
}
