import { scaleLog, scaleLinear } from "../../engine/vendor/d3.js";
import { fitSwarm, dodge } from "../../engine/charts/beeswarm.js";
import { xAxisMarks, orTicks } from "../../engine/charts/axes.js";
import { diamondPath, hbarPath, arrowPath } from "../../engine/charts/marks.js";
const DESIGN = { onp: "Observational, no panel", op: "Observational, panel", osm: "Selection / matching models", exp: "Experiments" };
const OUTCOME = { turnout: "Turnout", vote: "Vote choice", knowledge: "Issue knowledge" };
const DESIGN_ROWS = { turnout: ["onp", "op", "osm", "exp"], vote: ["op", "osm", "exp"] };
const P = { l: 2, r: 4 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const f2 = (v) => v.toFixed(2).replace("-", "\u2212");
export default function createGraphic({ data, htmlLayer }) {
  const { effects, numbers, moderators, rerun } = data;
  const N = (k) => {
    const v = numbers.values[k];
    if (!v) throw new Error(`numbers.json has no key ${k}`);
    return v;
  };
  const val = (k) => N(k).value;
  const disp = (k) => N(k).display;
  const byOutcome = (o) => effects.filter((e) => e.outcome === o);
  const orEffects = effects.filter((e) => e.metric === "or");
  const knowledge = byOutcome("knowledge");
  buildQuiz(htmlLayer);
  const tipFor = (e) => ({ title: `${e.metric === "or" ? "Odds ratio" : "Partial correlation"} ${f2(e.est)} [${f2(e.lo)}, ${f2(e.hi)}]`, lines: [e.study, `${e.election} \xB7 ${OUTCOME[e.outcome]}`, DESIGN[e.design]] });
  const dot = (e, cx, cy, r, cls = "", opacity = 1, extra = {}) => ({ type: "circle", key: e.id, cx, cy, r, cls: `dot ${cls}`.trim(), opacity, tip: tipFor(e), ...extra });
  function literatureLayout({ w, h }) {
    const r = clamp(w / 48, 4.5, 10);
    const s = 2 * r + 3.5;
    const span = 10.5 * s;
    const x0 = Math.max(P.l + 1.5 * s, (w - span) / 2 + 1.5 * s);
    const bandH = 20 + 3 * s;
    const gap = clamp(h * 0.05, 14, 30);
    const total = 3 * bandH + 2 * gap;
    let y = Math.max(34, (h - total) / 2 + 10);
    const pos = /* @__PURE__ */ new Map();
    const bands = [];
    for (const o of ["turnout", "vote", "knowledge"]) {
      bands.push({ o, y, n: byOutcome(o).length });
      for (const side of ["positive", "negative"]) {
        const list = byOutcome(o).filter((e) => e.direction === side).sort((a, b) => b.significant_reported - a.significant_reported || a.est - b.est);
        list.forEach((e, i) => {
          const col = Math.floor(i / 3), row = i % 3;
          const sign = side === "positive" ? 1 : -1;
          pos.set(e.id, { x: x0 + sign * (3 + r + col * s), y: y + 20 + r + row * s });
        });
      }
      y += bandH + gap;
    }
    return { r, s, x0, pos, bands, top: bands[0].y, bottom: y - gap, left: x0 - 1.5 * s };
  }
  function orLayout({ w, h }) {
    const x = scaleLog().domain([0.6, 7]).range([P.l + 8, w - P.r - 10]);
    const top = 40;
    const hT = h * 0.37, hV = h * 0.7;
    const rows = { turnout: { label: 4 + 9, top, bottom: hT - 20, diamond: hT - 9 }, vote: { label: hT + 13, top: hT + top - 4, bottom: hV - 20, diamond: hV - 9 } };
    const rMax = clamp(w / 72, 4, 6.5);
    const pos = /* @__PURE__ */ new Map();
    let r = rMax;
    const fits = {};
    for (const o of ["turnout", "vote"]) {
      const list = byOutcome(o);
      const half = (rows[o].bottom - rows[o].top) / 2;
      fits[o] = fitSwarm(list.map((e) => x(e.est)), { rMax, rMin: 3, halfHeight: half });
      r = Math.min(r, fits[o].r);
    }
    for (const o of ["turnout", "vote"]) {
      const list = byOutcome(o);
      const cy = (rows[o].top + rows[o].bottom) / 2;
      const half = (rows[o].bottom - rows[o].top) / 2;
      let ys = dodge(list.map((e) => x(e.est)), r);
      const ext = Math.max(1, ...ys.map(Math.abs));
      if (ext > half) ys = ys.map((v) => v * half / ext);
      list.forEach((e, i) => pos.set(e.id, { x: x(e.est), y: cy + ys[i] }));
    }
    const kTop = hV + 50;
    const x1 = x(1);
    const k = Math.min((x1 - P.l - 6) / 0.1, (w - P.r - 40 - x1) / 0.3);
    const kx = scaleLinear().domain([-0.1, 0.3]).range([x1 - 0.1 * k, x1 + 0.3 * k]);
    const kRow = kTop + 26;
    knowledge.forEach((e) => pos.set(e.id, { x: kx(e.est), y: kRow }));
    return { x, rows, r, pos, axisY: hV + 4, kTop, kx, kRow, kDiamond: kRow + 18, kTicks: kRow + 36, h, w };
  }
  function designLayout({ w, h }) {
    const L = orLayout({ w, h });
    const headerH = 22, axisH = 34, labelH = 13;
    const rowH = (h - 2 * headerH - axisH - 4) / 7;
    const half = Math.max(4, (rowH - labelH - 4) / 2 - L.r);
    const rows = [];
    let y = 0;
    const sections = {};
    for (const o of ["turnout", "vote"]) {
      sections[o] = { header: y + 14, top: y + 4 };
      y += headerH;
      for (const d of DESIGN_ROWS[o]) {
        rows.push({ o, d, labelY: y + 11, cy: y + labelH + 2 + half + L.r, half });
        y += rowH;
      }
      sections[o].bottom = y - 2;
    }
    const pos = /* @__PURE__ */ new Map();
    knowledge.forEach((e) => pos.set(e.id, L.pos.get(e.id)));
    const r = L.r;
    for (const row of rows) {
      const list = orEffects.filter((e) => e.outcome === row.o && e.design === row.d);
      let ys = dodge(list.map((e) => L.x(e.est)), r);
      const ext = Math.max(1, ...ys.map(Math.abs));
      if (ext > row.half) ys = ys.map((v) => v * row.half / ext);
      row.k = list.length;
      list.forEach((e, i) => pos.set(e.id, { x: L.x(e.est), y: row.cy + ys[i] }));
    }
    return { ...L, rows, sections, r, pos, axisY: y + 2, orPos: L.pos };
  }
  function orAxis(L, y0, y1, labelY, opacity = 1) {
    return xAxisMarks({ key: "or", scale: L.x, ticks: orTicks(L.w), y0, y1, labelY, format: (v) => String(v), ref: 1, opacity }).concat([{ type: "text", key: "or-ref", x: L.x(1), y: labelY + 13, anchor: "middle", text: "no effect", cls: "t-note", opacity }, { type: "text", key: "or-title", x: L.w - P.r - 10, y: labelY + 13, anchor: "end", text: "odds ratio (log scale) \u2192", cls: "t-note", opacity }]);
  }
  function pooledDiamond(o, L, opacity = 1, label = true) {
    const y = L.rows[o].diamond;
    const lo = L.x(val(`${o}.ci_lo`)), hi = L.x(val(`${o}.ci_hi`)), est = L.x(val(`${o}.or`));
    const marks = [{ type: "path", key: `pool-${o}`, d: diamondPath(lo, est, hi, y, 5.5), cls: "diamond", opacity }];
    marks.push({ type: "text", key: `pool-${o}-label`, x: hi + 6, y: y + 4, text: `pooled ${disp(`${o}.or`)}`, cls: "t-strong halo", opacity: label ? opacity : 0 });
    return marks;
  }
  function rowLabels(L, opacity = 1) {
    return [{ type: "text", key: "row-turnout", x: P.l, y: L.rows.turnout.label, text: "Turnout", cls: "t-head halo", opacity }, { type: "text", key: "row-vote", x: P.l, y: L.rows.vote.label, text: "Vote choice", cls: "t-head halo", opacity }];
  }
  function knowledgePanel(L, opacity = 1) {
    const ticks = [-0.1, 0, 0.1, 0.2, 0.3];
    const m = xAxisMarks({ key: "k", scale: L.kx, ticks, y0: L.kRow - 12, y1: L.kDiamond + 8, labelY: L.kTicks, format: (v) => v === 0 ? "0" : String(v).replace("-", "\u2212"), ref: 0, opacity });
    m.push({ type: "line", key: "k-sep", x1: P.l, x2: L.w - P.r, y1: L.kTop - 18, y2: L.kTop - 18, cls: "grid", opacity });
    m.push({ type: "text", key: "k-title", x: P.l, y: L.kTop - 2, text: "Issue knowledge \xB7 own scale (partial correlation)", cls: "t-strong", opacity });
    const lo = L.kx(val("knowledge.ci_lo")), hi = L.kx(val("knowledge.ci_hi")), est = L.kx(val("knowledge.r"));
    m.push({ type: "path", key: "pool-k", d: diamondPath(lo, est, hi, L.kDiamond, 5), cls: "diamond", opacity });
    m.push({ type: "text", key: "pool-k-label", x: hi + 6, y: L.kDiamond + 4, text: `pooled ${disp("knowledge.r")}`, cls: "t-strong halo", opacity });
    return m;
  }
  function dotsAt(pos, r, style = () => ({}), opts = {}) {
    return effects.map((e, i) => {
      const p = pos.get(e.id);
      const s = style(e);
      return dot(e, p.x, p.y, s.r ?? r, s.cls ?? "", s.opacity ?? 1, { delay: opts.stagger ? i * opts.stagger : 0, ...s.extra || {} });
    });
  }
  const states = { title(size) {
    const Lit = literatureLayout(size);
    return { marks: dotsAt(Lit.pos, 0, () => ({ opacity: 0 })), caption: null, enter: fitQuiz };
  }, quiz(size) {
    const s = states.title(size);
    return { ...s, caption: { title: "How a voting advice application works", note: ["Illustration: fictional parties and statements"] } };
  }, reach(size) {
    const { w, h } = size;
    const Lit = literatureLayout(size);
    const blocks = [{ key: "nl", head: "Netherlands 2017 \xB7 StemWijzer", use: "reach.stemwijzer_uses", unit: "uses", el: "reach.nl_electorate" }, { key: "de", head: "Germany 2017 \xB7 Wahl-O-Mat", use: "reach.wahlomat_sessions", unit: "sessions", el: "reach.de_electorate" }, { key: "ch", head: "Switzerland 2015 \xB7 smartvote", use: "reach.smartvote_sessions", unit: "sessions", el: "reach.ch_electorate" }];
    const t = 18, blockH = 18 + t + 5 + t + 22;
    const heroH = 96;
    let y = Math.max(8, (h - (3 * blockH + heroH)) / 2);
    const x0 = P.l, x1 = w - P.r;
    const marks = dotsAt(Lit.pos, 0, () => ({ opacity: 0 }));
    blocks.forEach((b, i) => {
      const k = val(b.use) / val(b.el);
      marks.push({ type: "text", key: `reach-${b.key}-h`, x: x0, y: y + 12, text: b.head, cls: "t-strong", delay: i * 120 });
      const yE = y + 18 + t / 2, yU = yE + t + 5;
      marks.push({ type: "path", key: `reach-${b.key}-el`, d: hbarPath(x0, x1, yE, t), enter: { d: hbarPath(x0, x0, yE, t) }, cls: "bar-track", delay: i * 120 });
      marks.push({ type: "text", key: `reach-${b.key}-el-l`, x: x0 + 7, y: yE + 4, text: `${disp(b.el)} eligible voters`, cls: "t-label", delay: i * 120 });
      const xu = x0 + k * (x1 - x0);
      marks.push({ type: "path", key: `reach-${b.key}-use`, d: hbarPath(x0, xu, yU, t), enter: { d: hbarPath(x0, x0, yU, t) }, cls: "bar-ink", delay: 200 + i * 120 });
      marks.push({ type: "text", key: `reach-${b.key}-use-l`, x: xu + 6, y: yU + 4, text: `${disp(b.use)} ${b.unit}`, cls: "t-strong", delay: 200 + i * 120 });
      y += blockH;
    });
    marks.push({ type: "line", key: "reach-sep", x1: x0, x2: x1, y1: y - 4, y2: y - 4, cls: "grid" });
    marks.push({ type: "text", key: "reach-hero-a", x: x0, y: y + 16, text: "In election surveys, more than", cls: "t-label" });
    marks.push({ type: "text", key: "reach-hero", x: x0, y: y + 58, text: `${val("reach.survey_share")}%`, cls: "t-hero" });
    marks.push({ type: "text", key: "reach-hero-b", x: x0 + (size.desktop ? 122 : 92), y: y + 42, text: "of the electorate used a VAA", cls: "t-label" });
    marks.push({ type: "text", key: "reach-hero-c", x: x0, y: y + 78, text: "(recent Swiss, German, Finnish, and Danish elections)", cls: "t-note" });
    return { marks, caption: { title: "Three popular VAAs, and how many eligible voters they could reach", note: [{ swatch: "dot key-dot--ink", text: "uses or sessions" }, { swatch: "dot", text: "eligible voters" }, "Bars scaled within each country. Sessions can include repeat visits."] } };
  }, literature(size) {
    const Lit = literatureLayout(size);
    const marks = dotsAt(Lit.pos, Lit.r, (e) => ({ cls: e.significant_reported ? "dot--solid" : "dot--hollow" }), { stagger: 6 });
    const yTop = Lit.top - 12, yBot = Lit.bottom;
    marks.push({ type: "text", key: "lit-neg", x: Lit.x0 - 6, y: yTop, text: "\u2190 negative", anchor: "end", cls: "t-note" });
    marks.push({ type: "text", key: "lit-pos", x: Lit.x0 + 6, y: yTop, text: "positive \u2192", cls: "t-note" });
    for (const b of Lit.bands) {
      marks.push({ type: "text", key: `lit-band-${b.o}`, x: Lit.left, y: b.y + 12, text: `${OUTCOME[b.o]} \xB7 ${b.n} effects`, cls: "t-strong" });
      marks.push({ type: "line", key: `lit-axis-${b.o}`, x1: Lit.x0, x2: Lit.x0, y1: b.y + 18, y2: b.y + 22 + 3 * Lit.s, cls: "ref" });
    }
    return { marks, duration: 1e3, caption: { title: `${disp("scope.effects")} published estimates of VAA effects`, note: [{ swatch: "dot key-dot--ink", text: "statistically significant" }, { swatch: "dot key-dot--hollow", text: "not significant" }] } };
  }, funnel(size) {
    const { w, h } = size;
    const Lit = literatureLayout(size);
    const stages = [{ key: "s1", label: "Papers found", n: "screen.identified", drop: "screen.drop_step2", why: "not about VAA effects" }, { key: "s2", label: "Studied VAA effects", n: "screen.after_step2", drop: "screen.drop_step3", why: "out of scope" }, { key: "s3", label: "In scope", n: "screen.after_step3", drop: "screen.drop_step4", why: "incompatible or duplicate data" }, { key: "s4", label: "Included in our meta-analysis", n: "screen.included" }];
    const t = 18, rowH = 16 + t + 24;
    let y = Math.max(8, (h - stages.length * rowH) / 2);
    const x0 = P.l, max = w - P.r - x0;
    const marks = dotsAt(Lit.pos, 0, () => ({ opacity: 0 }));
    stages.forEach((s, i) => {
      const len = Math.max(3, val(s.n) / val("screen.identified") * max);
      marks.push({ type: "text", key: `fun-${s.key}-l`, x: x0, y: y + 12, text: `${s.label} \xB7 ${disp(s.n)}`, cls: i === 3 ? "t-head" : "t-strong", delay: i * 220 });
      marks.push({ type: "path", key: `fun-${s.key}-bar`, d: hbarPath(x0, x0 + len, y + 18 + t / 2, t), enter: { d: hbarPath(x0, x0, y + 18 + t / 2, t) }, cls: i === 3 ? "bar-ink" : "bar-track", delay: i * 220 });
      if (s.drop) marks.push({ type: "text", key: `fun-${s.key}-d`, x: x0 + 10, y: y + 18 + t + 15, text: `\u2193 ${disp(s.drop)} set aside: ${s.why}`, cls: "t-note", delay: i * 220 + 100 });
      y += rowH;
    });
    return { marks, duration: 900, caption: { title: "How we found the studies", note: [`Search completed ${disp("scope.search_end")}`] } };
  }, pooled(size) {
    const L = orLayout(size);
    const marks = [...orAxis(L, 20, L.axisY, L.axisY + 13), ...rowLabels(L), ...dotsAt(L.pos, L.r, (e) => e.outcome === "knowledge" ? { r: Math.max(4, L.r) } : {}, { stagger: 4 }), ...pooledDiamond("turnout", L), ...pooledDiamond("vote", L), ...knowledgePanel(L)];
    return { marks, duration: 1100, caption: { title: "Combining all the estimates", note: [{ swatch: "dot", text: "one estimate" }, { swatch: "diamond", text: "pooled estimate with 95% interval" }] } };
  }, knowledge(size) {
    const L = orLayout(size);
    const kn = knowledge.slice().sort((a, b) => a.est - b.est);
    const neg = kn[0];
    const marks = [...orAxis(L, 20, L.axisY, L.axisY + 13, 0.35), ...rowLabels(L, 0.35), ...dotsAt(L.pos, L.r, (e) => e.outcome === "knowledge" ? { r: Math.max(5, L.r + 1), cls: "dot--ink" } : { opacity: 0.18 }), ...pooledDiamond("turnout", L, 0.15, false), ...pooledDiamond("vote", L, 0.15, false), ...knowledgePanel(L)];
    const p = L.pos.get(neg.id);
    marks.push({ type: "text", key: "k-neg", x: p.x - 8, y: p.y - 12, anchor: "start", text: `${neg.study} \xB7 largest study`, cls: "t-label halo" });
    return { marks, duration: 800, caption: { title: `Issue knowledge: only ${disp("scope.k_knowledge")} studies`, note: [{ swatch: "dot key-dot--ink", text: "one study (partial correlation)" }, { swatch: "diamond", text: "pooled, with 95% interval" }] } };
  }, spread(size) {
    const L = orLayout(size);
    const turn = byOutcome("turnout");
    const maxE = turn.reduce((a, b) => b.est > a.est ? b : a);
    const nulls = turn.filter((e) => e.lo <= 1 && e.est < 1.1);
    const hiIds = /* @__PURE__ */ new Set([maxE.id, ...nulls.map((e) => e.id)]);
    const marks = [...orAxis(L, 20, L.axisY, L.axisY + 13), ...rowLabels(L), ...dotsAt(L.pos, L.r, (e) => {
      if (e.outcome === "knowledge") return { r: Math.max(4, L.r), opacity: 0 };
      return hiIds.has(e.id) ? { cls: "dot--ink" } : { opacity: 0.45 };
    }), ...pooledDiamond("turnout", L, 0.2, false), ...pooledDiamond("vote", L, 0.2, false), ...knowledgePanel(L, 0)];
    const pMax = L.pos.get(maxE.id);
    marks.push({ type: "text", key: "ann-max", x: pMax.x + L.r, y: 13, anchor: "end", text: `Odds ratio ${disp("turnout.max_or")} \xB7 ${maxE.election}`, cls: "t-strong halo" });
    marks.push({ type: "line", key: "ann-max-l", x1: pMax.x, x2: pMax.x, y1: 18, y2: pMax.y - L.r - 2, cls: "leader" });
    const nx = Math.min(...nulls.map((e) => L.pos.get(e.id).x)) - L.r;
    const studies = [...new Set(nulls.map((e) => e.study))].join("; ");
    const ny = L.rows.turnout.bottom + 6;
    marks.push({ type: "text", key: "ann-null", x: nx, y: ny, text: "No effect:", cls: "t-strong halo" });
    marks.push({ type: "text", key: "ann-null-2", x: nx, y: ny + 13, text: studies, cls: "t-label halo" });
    const y = L.kTop + 6;
    marks.push({ type: "text", key: "i2-hero", x: P.l, y: y + 30, text: disp("turnout.i2"), cls: "t-hero" });
    marks.push({ type: "text", key: "i2-a", x: P.l + (size.desktop ? 122 : 92), y: y + 8, text: "of the spread in turnout estimates", cls: "t-label" });
    marks.push({ type: "text", key: "i2-b", x: P.l + (size.desktop ? 122 : 92), y: y + 22, text: "is real disagreement between studies,", cls: "t-label" });
    marks.push({ type: "text", key: "i2-c", x: P.l + (size.desktop ? 122 : 92), y: y + 36, text: `not chance. Vote choice: ${disp("vote.i2")}.`, cls: "t-label" });
    return { marks, duration: 800, caption: { title: "The studies disagree, a lot", note: [{ swatch: "dot key-dot--ink", text: "the most extreme turnout estimates" }] } };
  }, selection(size) {
    const { w, h } = size;
    const L = orLayout(size);
    const marks = dotsAt(L.pos, L.r, () => ({ opacity: 0 }));
    const nw = clamp(w * 0.4, 118, 190), nh = 44;
    const cx = w / 2, yTop = h * 0.22, yBot = h * 0.66;
    const lx = clamp(w * 0.23, nw / 2 + P.l, w / 2 - 20), rx = w - lx;
    const node = (key, x, y, line1, line2) => [{ type: "rect", key: `n-${key}`, x: x - nw / 2, y: y - nh / 2, width: nw, height: nh, rx: 8, cls: "node" }, { type: "text", key: `n-${key}-1`, x, y: line2 ? y - 3 : y + 4, text: line1, anchor: "middle", cls: "t-strong" }, ...line2 ? [{ type: "text", key: `n-${key}-2`, x, y: y + 12, text: line2, anchor: "middle", cls: "t-label" }] : []];
    marks.push(...node("interest", cx, yTop, "Interest in politics", "(before any VAA)"));
    marks.push(...node("vaa", lx, yBot, "Uses a VAA"));
    marks.push(...node("vote", rx, yBot, "Votes"));
    marks.push({ type: "path", key: "a-1", d: arrowPath(cx - nw * 0.25, yTop + nh / 2 + 2, lx + nw * 0.1, yBot - nh / 2 - 4), cls: "arrow", delay: 150 });
    marks.push({ type: "path", key: "a-2", d: arrowPath(cx + nw * 0.25, yTop + nh / 2 + 2, rx - nw * 0.1, yBot - nh / 2 - 4), cls: "arrow", delay: 300 });
    marks.push({ type: "path", key: "a-3", d: arrowPath(lx + nw / 2 + 4, yBot, rx - nw / 2 - 4, yBot), cls: "arrow-q", delay: 500 });
    marks.push({ type: "text", key: "a-3-l", x: w / 2, y: yBot - 8, text: "?", anchor: "middle", cls: "t-head", delay: 500 });
    marks.push({ type: "text", key: "a-3-l2", x: w / 2, y: yBot + nh / 2 + 22, text: "the effect we want to measure", anchor: "middle", cls: "t-note", delay: 500 });
    const m1 = (cx - nw * 0.25 + (lx + nw * 0.1)) / 2, m2 = (cx + nw * 0.25 + (rx - nw * 0.1)) / 2;
    marks.push({ type: "text", key: "a-1-l", x: m1 - 10, y: (yTop + yBot) / 2 + 4, text: "more likely", anchor: "end", cls: "t-note", delay: 150 });
    marks.push({ type: "text", key: "a-2-l", x: m2 + 10, y: (yTop + yBot) / 2 + 4, text: "more likely", cls: "t-note", delay: 300 });
    return { marks, duration: 700, caption: { title: "Why users and non-users differ anyway", note: ["Illustration, not data"] } };
  }, "design-sort"(size) {
    return designState(size, "sort");
  }, "design-estimates"(size) {
    return designState(size, "estimates");
  }, verdict(size) {
    return designState(size, "verdict");
  }, context(size) {
    const { w, h } = size;
    const D = designLayout(size);
    const marks = dotsAt(D.pos, D.r, (e) => ({ opacity: 0, ...e.outcome === "knowledge" ? { r: 0 } : {} }));
    const gap = 18, panelW = (w - P.l - P.r - gap) / 2;
    const cols = [["country", "type"], ["year", "size"]];
    const panels = Object.fromEntries(moderators.panels.map((p) => [p.id, p]));
    const headerH = 22, axisH = 26, panelGap = 16;
    const rowH = clamp((h - 2 * (headerH + axisH) - panelGap) / 8, 18, 46);
    const highlight = /* @__PURE__ */ new Set(["year:2015\u201317", "size:Small"]);
    const ticks = [1, 2, 3];
    cols.forEach((ids, c) => {
      const x0 = P.l + c * (panelW + gap);
      const x = scaleLog().domain([0.8, 4.2]).range([x0 + 4, x0 + panelW - 4]);
      let y = 4;
      ids.forEach((id) => {
        const p = panels[id];
        const rows = p.turnout;
        marks.push({ type: "text", key: `ctx-${id}-h`, x: x0, y: y + 12, text: p.label, cls: "t-head halo" });
        const y0 = y + headerH, y1 = y0 + rows.length * rowH;
        marks.push(...xAxisMarks({ key: `ctx-${id}`, scale: x, ticks, y0, y1, labelY: y1 + 13, format: String, ref: 1 }));
        const xp = x(val("turnout.or"));
        marks.push({ type: "line", key: `ctx-${id}-pool`, x1: xp, x2: xp, y1: y0, y2: y1, cls: "ref-soft" });
        rows.forEach((row, i) => {
          const ry = y0 + i * rowH;
          const on = highlight.has(`${id}:${row.level}`);
          const name = p.level_labels?.[row.level] ?? row.level;
          const est = Math.exp(row.est), lo = Math.exp(row.lo), hi = Math.exp(row.hi);
          marks.push({ type: "text", key: `ctx-${id}-${i}-l`, x: x0, y: ry + 10, text: name, cls: on ? "t-strong halo" : "t-label halo" });
          marks.push({ type: "line", key: `ctx-${id}-${i}-ci`, x1: x(lo), x2: x(hi), y1: ry + rowH - 7, y2: ry + rowH - 7, cls: "range", opacity: on ? 1 : 0.55 });
          marks.push({ type: "circle", key: `ctx-${id}-${i}`, cx: x(est), cy: ry + rowH - 7, r: 4.5, cls: on ? "dot dot--ink" : "dot", tip: { title: `Odds ratio ${f2(est)} [${f2(lo)}, ${f2(hi)}]`, lines: [`${p.label}: ${name}`, `${row.k} effects \xB7 Table ${p.table.turnout}`] } });
        });
        y = y1 + axisH + panelGap;
      });
    });
    return { marks, duration: 700, caption: { title: "Turnout effects by context (odds ratio, 95% interval)", note: [{ swatch: "dot key-dot--ink", text: "groups with smaller effects" }, "Thin line: estimate across all studies"] } };
  }, newer(size) {
    return newerState(size, null);
  }, "newer-ai"(size) {
    return newerState(size, "velez");
  }, canvass(size) {
    const { w, h } = size;
    const D = designLayout(size);
    const marks = dotsAt(D.pos, D.r, (e) => ({ opacity: 0, ...e.outcome === "knowledge" ? { r: 0 } : {} }));
    const x = scaleLinear().domain([0, 7.5]).range([P.l + 8, w - P.r - 14]);
    const proj = [{ k: "projected.de2009_pp", lab: "Germany 2009" }, { k: "projected.ch2007_pp", lab: "Switzerland 2007" }, { k: "projected.nl2006_pp", lab: "Netherlands 2006" }, { k: "projected.nl2012_pp", lab: "Netherlands 2012" }];
    const rowH = clamp(h * 0.11, 38, 72);
    const top = Math.max(100, (h - 4 * rowH - 70) / 2 + 60);
    const bottom = top + 4 * rowH;
    const lo = val("canvass.europe_pp"), hi = val("canvass.us_pp");
    marks.push({ type: "rect", key: "cv-band", x: x(lo), y: top - 24, width: x(hi) - x(lo), height: bottom - top + 24, rx: 4, cls: "band-accent", z: 0 });
    marks.push({ type: "text", key: "cv-h", x: P.l, y: top - 72, text: "Shaded: where we think VAA effects might lie", cls: "t-strong halo" });
    marks.push({ type: "text", key: "cv-h2", x: P.l, y: top - 57, text: "the range of door-to-door canvassing effects,", cls: "t-label halo" });
    marks.push({ type: "text", key: "cv-h3", x: P.l, y: top - 43, text: `from ${disp("canvass.europe_pp")} (Europe) to ${disp("canvass.us_pp")} (US)`, cls: "t-label halo" });
    marks.push(...xAxisMarks({ key: "pp", scale: x, ticks: [1, 2, 3, 4, 5, 6, 7], y0: top - 24, y1: bottom, labelY: bottom + 14, format: String, ref: 0 }));
    marks.push({ type: "text", key: "pp-title", x: w - P.r - 14, y: bottom + 28, anchor: "end", text: "percentage points of turnout \u2192", cls: "t-note" });
    marks.push({ type: "text", key: "vp-h", x: P.l, y: bottom + 50, text: "Dots: VAA effects on overall turnout,", cls: "t-label" });
    marks.push({ type: "text", key: "vp-h2", x: P.l, y: bottom + 64, text: "as projected by individual studies", cls: "t-label" });
    proj.forEach((p, i) => {
      const y = top + i * rowH;
      const px = x(val(p.k));
      marks.push({ type: "text", key: `vp-${i}-n`, x: P.l + 10, y: y + 12, text: p.lab, cls: "t-label halo", delay: 150 * i });
      marks.push({ type: "circle", key: `vp-${i}`, cx: px, cy: y + rowH * 0.6, r: 6, cls: "dot dot--ink", delay: 150 * i, tip: { title: `${disp(p.k)} percentage points`, lines: [p.lab, "Projected effect on overall turnout"] } });
      const right = px < w * 0.75;
      marks.push({ type: "text", key: `vp-${i}-l`, x: right ? px + 10 : px - 10, y: y + rowH * 0.6 + 4, anchor: right ? "start" : "end", text: disp(p.k), cls: "t-strong halo", delay: 150 * i });
    });
    return { marks, duration: 700, caption: { title: "A reality check: canvassing vs. projected VAA effects", note: ["Effects on turnout, in percentage points"] } };
  } };
  function newerState(size, focus) {
    const { w, h } = size;
    const D = designLayout(size);
    const marks = dotsAt(D.pos, D.r, (e) => ({ opacity: 0, ...e.outcome === "knowledge" ? { r: 0 } : {} }));
    const studies = [{ key: "frese", title: `Frese, Hix & Lachat, ${disp("newer.frese_year")}`, sub: `European Parliament ${disp("newer.election_year")} \xB7 Germany, Italy, France`, cells: [["none", "No effect"], ["mixed", "No more switching,", "better-aligned choices"], ["none", "No effect"]] }, { key: "germann", title: `Germann et al., ${disp("newer.germann_year")}`, sub: `UK general election ${disp("newer.election_year")}`, cells: [["none", "No effect"], ["mixed", "Shifts preferences;", "moves undecided voters"], ["yes", "Sense of own position", "became more accurate"]] }, { key: "velez", title: `Velez, Green & Sevi, ${disp("newer.velez_year")}`, sub: "A chatbot VAA \xB7 United States \xB7 young adults without a party", cells: [["na", "Not measured"], ["none", "Seldom sways", "vote preferences"], ["yes", "Improves knowledge", "of party stances"]] }];
    const cols = ["Turnout", "Vote choice", "Knowledge"];
    const colW = (w - P.l - P.r) / 3;
    const stacked = colW < 160;
    const mark = (key, kind, x, cy, op, d) => {
      if (kind === "na") return [{ type: "text", key: `${key}-m`, x: x - 3, y: cy + 4, text: "\u2013", cls: "t-strong", opacity: op, delay: d }];
      if (kind === "mixed") return [{ type: "circle", key: `${key}-m`, cx: x, cy, r: 5.5, cls: "dot dot--hollow", opacity: op, delay: d }, { type: "path", key: `${key}-h`, d: `M${x},${cy - 5.5}A5.5,5.5 0 0 0 ${x},${cy + 5.5}Z`, cls: "diamond", opacity: op, delay: d, z: 2 }];
      return [{ type: "circle", key: `${key}-m`, cx: x, cy, r: 5.5, cls: kind === "yes" ? "dot dot--solid" : "dot dot--hollow", opacity: op, delay: d }];
    };
    const rowH = stacked ? clamp(h * 0.27, 96, 130) : clamp(h * 0.24, 92, 150);
    let y = Math.max(8, (h - ((stacked ? 0 : 34) + studies.length * rowH)) / 2);
    if (!stacked) {
      cols.forEach((c, i) => marks.push({ type: "text", key: `nw-col-${i}`, x: P.l + i * colW, y: y + 12, text: c, cls: "t-head" }));
      marks.push({ type: "line", key: "nw-rule", x1: P.l, x2: w - P.r, y1: y + 22, y2: y + 22, cls: "grid" });
      y += 34;
    }
    studies.forEach((s, r) => {
      const op = focus && focus !== s.key ? 0.3 : 1;
      const d = r * 120;
      marks.push({ type: "text", key: `nw-${s.key}-t`, x: P.l, y: y + 12, text: s.title, cls: "t-strong", opacity: op, delay: d });
      marks.push({ type: "text", key: `nw-${s.key}-s`, x: P.l, y: y + 26, text: s.sub, cls: "t-note", opacity: op, delay: d });
      s.cells.forEach(([kind, ...lines], c) => {
        const key = `nw-${s.key}-${c}`;
        if (stacked) {
          const cy = y + 44 + c * 17;
          marks.push({ type: "text", key: `${key}-o`, x: P.l, y: cy + 4, text: cols[c], cls: "t-note", opacity: op, delay: d });
          marks.push(...mark(key, kind, P.l + 82, cy, op, d));
          marks.push({ type: "text", key: `${key}-0`, x: P.l + 94, y: cy + 4, text: lines.join(" "), cls: "t-label", opacity: op, delay: d });
        } else {
          const x0 = P.l + c * colW, cy = y + 46;
          marks.push(...mark(key, kind, x0 + 6, cy, op, d));
          lines.forEach((ln, k) => marks.push({ type: "text", key: `${key}-${k}`, x: x0 + 16, y: cy + 4 + k * 14, text: ln, cls: "t-label", opacity: op, delay: d }));
        }
      });
      if (r < studies.length - 1) marks.push({ type: "line", key: `nw-sep-${r}`, x1: P.l, x2: w - P.r, y1: y + rowH - 10, y2: y + rowH - 10, cls: "grid" });
      y += rowH;
    });
    return { marks, duration: 700, caption: { title: "Newer experiments, after our search", note: [{ swatch: "dot key-dot--ink", text: "effect" }, { swatch: "dot key-half", text: "mixed" }, { swatch: "dot key-dot--hollow", text: "no clear effect" }, "Not part of our meta-analysis"] } };
  }
  function designState(size, mode) {
    const D = designLayout(size);
    const marks = [...orAxis(D, 20, D.axisY - 4, D.axisY + 10, 1)];
    for (const o of ["turnout", "vote"]) {
      const s = D.sections[o];
      marks.push({ type: "text", key: `row-${o}`, x: P.l, y: s.header, text: OUTCOME[o], cls: "t-head halo" });
      const xp = D.x(val(`${o}.or`));
      const showRef = mode !== "sort";
      marks.push({ type: "line", key: `all-${o}`, x1: xp, x2: xp, y1: s.top + 14, y2: s.bottom, cls: "ref-soft", opacity: showRef ? 1 : 0 });
      marks.push({ type: "text", key: `all-${o}-l`, x: xp + 4, y: s.header, text: "all studies", cls: "t-note halo", opacity: showRef ? 1 : 0 });
    }
    for (const row of D.rows) {
      const isExp = row.d === "exp";
      const fade = mode === "verdict" && !isExp ? 0.3 : 1;
      const lx = isExp ? P.l + 12 : P.l;
      if (isExp) marks.push({ type: "circle", key: `sw-${row.o}`, cx: P.l + 4, cy: row.labelY - 4, r: 4, cls: "dot dot--accent" });
      marks.push({ type: "text", key: `dl-${row.o}-${row.d}`, x: lx, y: row.labelY, text: `${DESIGN[row.d]} \xB7 ${row.k}`, cls: isExp ? "t-strong halo" : "t-label halo", opacity: fade });
      const est = rerun.design[row.o][row.d];
      const show = mode !== "sort";
      const labKey = `${row.o}.${row.d}.or`;
      const label = isExp ? `${disp(`${row.o}.exp.or`)} [${disp(`${row.o}.exp.ci_lo`)}, ${disp(`${row.o}.exp.ci_hi`)}]` : disp(labKey);
      const lo = isExp ? val(`${row.o}.exp.ci_lo`) : est.lo;
      const hi = isExp ? val(`${row.o}.exp.ci_hi`) : est.hi;
      const e = isExp ? val(`${row.o}.exp.or`) : est.est;
      marks.push({ type: "path", key: `dd-${row.o}-${row.d}`, d: diamondPath(D.x(lo), D.x(e), D.x(hi), row.cy, 5.5), enter: { d: diamondPath(D.x(e), D.x(e), D.x(e), row.cy, 0) }, cls: isExp ? "diamond diamond--accent" : "diamond", opacity: show ? fade : 0, z: 3, delay: show ? 300 : 0 });
      marks.push({ type: "text", key: `dv-${row.o}-${row.d}`, x: D.w - P.r, y: row.labelY, anchor: "end", text: label, cls: isExp ? "t-strong" : "t-label", opacity: show ? fade : 0, delay: show ? 300 : 0 });
    }
    const dotsOpacity = (e) => {
      if (e.outcome === "knowledge") return 0;
      if (mode === "sort") return 1;
      if (mode === "verdict") return e.design === "exp" ? 0.8 : 0.15;
      return e.design === "exp" ? 0.75 : 0.45;
    };
    marks.push(...effects.map((e, i) => {
      const p = e.outcome === "knowledge" ? D.orPos.get(e.id) : D.pos.get(e.id);
      return dot(e, p.x, p.y, e.outcome === "knowledge" ? Math.max(4, D.r) : D.r, e.design === "exp" ? "dot--accent" : "", dotsOpacity(e), { delay: mode === "sort" ? i * 9 : 0 });
    }));
    const captions = { sort: { title: "The same estimates, sorted by study design", note: [{ swatch: "dot", text: "observational" }, { swatch: "dot key-dot--accent", text: "experiment" }] }, estimates: { title: "Estimates by study design", note: [{ swatch: "diamond", text: "estimate with 95% interval" }, { swatch: "dot key-dot--accent", text: "experiment" }, "Thin line: all studies"] }, verdict: { title: "The best evidence: experiments", note: [{ swatch: "dot key-dot--accent", text: "experiment" }, { swatch: "diamond", text: "estimate with 95% interval" }] } };
    return { marks, duration: mode === "sort" ? 1300 : 800, caption: captions[mode] };
  }
  return { state(name, size) {
    const fn = states[name];
    if (!fn) throw new Error(`unknown graphic state "${name}"`);
    return fn(size);
  } };
}
const STATEMENTS = ["Cities should build more bike lanes.", "Shops should be allowed to open on Sundays.", "The voting age should be lowered to 16."];
const PARTIES = [{ name: "Party A", pos: [1, 0, 1] }, { name: "Party B", pos: [1, 1, 0] }, { name: "Party C", pos: [0, 1, 0] }];
function fitQuiz(layer, size) {
  const card = layer.querySelector(".vaa-phone");
  if (!card) return;
  card.style.setProperty("--fit", "1");
  const need = card.offsetHeight + 12, needW = card.offsetWidth + 8;
  card.style.setProperty("--fit", String(Math.min(1, size.h / need, size.w / needW)));
}
function buildQuiz(layer) {
  const answers = [1, 0, 1];
  const card = document.createElement("div");
  card.className = "vaa-phone";
  card.dataset.states = "title quiz";
  const h = document.createElement("p");
  h.className = "vaa-phone__eyebrow";
  h.textContent = "Which party matches you?";
  const list = document.createElement("ol");
  list.className = "vaa-q";
  STATEMENTS.forEach((text, i) => {
    const li = document.createElement("li");
    li.className = "vaa-q__item";
    const p = document.createElement("p");
    p.textContent = text;
    p.id = `vaa-q-${i}`;
    const group = document.createElement("div");
    group.className = "vaa-q__btns";
    group.setAttribute("role", "group");
    group.setAttribute("aria-labelledby", p.id);
    for (const [v, label] of [[1, "Agree"], [0, "Disagree"]]) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", () => {
        answers[i] = v;
        update();
      });
      b.dataset.v = v;
      group.appendChild(b);
    }
    li.append(p, group);
    list.appendChild(li);
  });
  const res = document.createElement("div");
  res.className = "vaa-res";
  const rh = document.createElement("p");
  rh.className = "vaa-res__h";
  rh.textContent = "Your matches";
  const ol = document.createElement("ol");
  ol.setAttribute("aria-live", "polite");
  res.append(rh, ol);
  const note = document.createElement("p");
  note.className = "vaa-phone__note";
  note.textContent = "Illustration: fictional parties and statements";
  card.append(h, list, res, note);
  layer.appendChild(card);
  function update() {
    list.querySelectorAll(".vaa-q__btns").forEach((g, i) => {
      g.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.v === answers[i])));
    });
    const scored = PARTIES.map((p) => ({ ...p, score: p.pos.reduce((s, v, i) => s + (v === answers[i] ? 1 : 0), 0) })).sort((a, b) => b.score - a.score);
    ol.replaceChildren(...scored.map((p) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "vaa-res__name";
      name.textContent = p.name;
      const bar = document.createElement("span");
      bar.className = "vaa-res__bar";
      const fill = document.createElement("i");
      fill.style.width = `${p.score / STATEMENTS.length * 100}%`;
      bar.appendChild(fill);
      const sc = document.createElement("span");
      sc.className = "vaa-res__score";
      sc.textContent = `${p.score} of ${STATEMENTS.length} agree`;
      li.append(name, bar, sc);
      return li;
    }));
  }
  update();
}
