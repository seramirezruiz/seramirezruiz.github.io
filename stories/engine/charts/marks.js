import { select, easeCubicInOut } from "../vendor/d3.js";
const GEOM = { circle: ["cx", "cy", "r"], line: ["x1", "y1", "x2", "y2"], rect: ["x", "y", "width", "height", "rx"], path: ["d"], text: ["x", "y", "dy"] };
const DEFAULT_Z = { line: 0, rect: 1, path: 1, circle: 2, text: 3 };
const LAYERS = 4;
function ensureLayers(svg) {
  const root = select(svg);
  for (let z = 0; z < LAYERS; z++) {
    if (root.select(`g.z${z}`).empty()) root.append("g").attr("class", `z${z}`);
  }
  return root;
}
function applyGeom(sel, getter) {
  sel.each(function(d) {
    const el = select(this);
    const src = getter(d);
    for (const a of GEOM[d.type]) if (src[a] !== void 0) el.attr(a, src[a]);
  });
}
export function renderMarks(svg, marks, { duration = 0 } = {}) {
  const root = ensureLayers(svg);
  const byZ = Array.from({ length: LAYERS }, () => []);
  const seen = /* @__PURE__ */ new Set();
  for (const m of marks) {
    const k = `${m.type}:${m.key}`;
    if (seen.has(k)) throw new Error(`duplicate mark key ${k}`);
    seen.add(k);
    byZ[m.z ?? DEFAULT_Z[m.type]].push(m);
  }
  for (let z = 0; z < LAYERS; z++) {
    const layer = root.select(`g.z${z}`);
    const sel = layer.selectAll(":scope > *").data(byZ[z], (d) => `${d.type}:${d.key}`);
    const exit = sel.exit().interrupt();
    if (duration) exit.transition().duration(duration * 0.5).attr("opacity", 0).remove();
    else exit.remove();
    const enter = sel.enter().append((d) => document.createElementNS("http://www.w3.org/2000/svg", d.type)).attr("opacity", 0);
    applyGeom(enter, (d) => ({ ...d, ...d.enter || {} }));
    const all = enter.merge(sel).interrupt();
    all.attr("class", (d) => d.cls || null).attr("style", (d) => d.style || null).attr("text-anchor", (d) => d.type === "text" ? d.anchor || "start" : null).each(function(d) {
      if (d.type !== "text") return;
      if (!d.spans) {
        this.textContent = d.text ?? "";
        return;
      }
      this.replaceChildren(...d.spans.map((sp) => {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        if (sp.cls) t.setAttribute("class", sp.cls);
        t.textContent = sp.text;
        return t;
      }));
    });
    if (duration) {
      const t = all.transition().duration(duration).ease(easeCubicInOut).delay((d) => d.delay || 0);
      t.attr("opacity", (d) => d.opacity ?? 1);
      t.each(function(d) {
        const tr = select(this).transition(t);
        for (const a of GEOM[d.type]) if (d[a] !== void 0) tr.attr(a, d[a]);
      });
      all.order();
    } else {
      all.attr("opacity", (d) => d.opacity ?? 1);
      applyGeom(all, (d) => d);
      all.order();
    }
  }
}
export function diamondPath(xLo, xEst, xHi, y, h = 6) {
  return `M${xLo},${y}L${xEst},${y - h}L${xHi},${y}L${xEst},${y + h}Z`;
}
export function hbarPath(x0, x1, y, t = 14, r = 4) {
  const len = Math.max(0, x1 - x0);
  const rr = Math.min(r, len, t / 2);
  const top = y - t / 2, bot = y + t / 2;
  if (len === 0) return `M${x0},${top}L${x0},${bot}L${x0},${bot}L${x0},${top}Z`;
  return `M${x0},${top}L${x1 - rr},${top}Q${x1},${top} ${x1},${top + rr}L${x1},${bot - rr}Q${x1},${bot} ${x1 - rr},${bot}L${x0},${bot}Z`;
}
export function arrowPath(x1, y1, x2, y2, h = 7) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (ang) => `${x2 - h * Math.cos(a - ang)},${y2 - h * Math.sin(a - ang)}`;
  return `M${x1},${y1}L${x2},${y2}M${p(0.45)}L${x2},${y2}L${p(-0.45)}`;
}
