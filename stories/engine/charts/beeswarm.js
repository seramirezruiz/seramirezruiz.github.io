export function dodge(xs, r, gap = 1.5) {
  const d = 2 * r + gap;
  const order = xs.map((x, i) => i).sort((a, b) => xs[a] - xs[b] || a - b);
  const placed = [];
  const ys = new Array(xs.length).fill(0);
  for (const i of order) {
    const x = xs[i];
    const near = placed.filter((p) => Math.abs(p.x - x) < d);
    let y = 0;
    for (let k = 0; k < 400; k++) {
      const step = Math.ceil(k / 2) * (d * 0.5);
      y = k === 0 ? 0 : k % 2 ? -step : step;
      if (near.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 >= d * d - 1e-6)) break;
    }
    ys[i] = y;
    placed.push({ x, y });
  }
  return ys;
}
export function fitSwarm(xs, { rMax, rMin = 3, halfHeight, gap = 1.5 }) {
  for (let r = rMax; r >= rMin; r -= 0.25) {
    const ys2 = dodge(xs, r, gap);
    const ext2 = Math.max(0, ...ys2.map(Math.abs));
    if (ext2 <= halfHeight) return { r, ys: ys2 };
  }
  const ys = dodge(xs, rMin, gap);
  const ext = Math.max(1, ...ys.map(Math.abs));
  const k = halfHeight / ext;
  return { r: rMin, ys: ys.map((y) => y * k) };
}
export function unitGrid(n, { rows = 3, size = 12 }) {
  return Array.from({ length: n }, (_, i) => ({ col: Math.floor(i / rows), row: i % rows, dx: Math.floor(i / rows) * size, dy: i % rows * size }));
}
