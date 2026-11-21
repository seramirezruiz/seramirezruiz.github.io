export function xAxisMarks({ key, scale, ticks, y0, y1, labelY, format = String, ref, refLabel, refLabelY, opacity = 1 }) {
  const marks = [];
  for (const t of ticks) {
    if (t === ref) continue;
    const x = Math.round(scale(t)) + 0.5;
    marks.push({ type: "line", key: `${key}-grid-${t}`, x1: x, x2: x, y1: y0, y2: y1, cls: "grid", opacity });
    if (labelY !== void 0) {
      marks.push({ type: "text", key: `${key}-tick-${t}`, x, y: labelY, text: format(t), anchor: "middle", cls: "t-tick", opacity });
    }
  }
  if (ref !== void 0) {
    const x = scale(ref);
    marks.push({ type: "line", key: `${key}-ref`, x1: x, x2: x, y1: y0, y2: y1, cls: "ref", opacity });
    if (labelY !== void 0) {
      marks.push({ type: "text", key: `${key}-tick-${ref}`, x, y: labelY, text: format(ref), anchor: "middle", cls: "t-tick", opacity });
    }
    if (refLabel) {
      marks.push({ type: "text", key: `${key}-reflabel`, x: x + 4, y: refLabelY ?? y0 + 10, text: refLabel, cls: "t-note halo", opacity });
    }
  }
  return marks;
}
export function orTicks(width) {
  return width < 420 ? [0.75, 1, 1.5, 2, 3, 5] : [0.75, 1, 1.5, 2, 3, 4, 6];
}
export const fmtOR = (v) => v < 1 ? String(v).replace(/^0/, "0") : String(v);
