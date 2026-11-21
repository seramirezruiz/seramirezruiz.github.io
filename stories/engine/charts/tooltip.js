import { select } from "../vendor/d3.js";
export function attachTooltip(stage, svg) {
  const tip = document.createElement("div");
  tip.className = "g-tip";
  tip.setAttribute("aria-hidden", "true");
  stage.appendChild(tip);
  let active = null;
  function hide() {
    tip.classList.remove("is-on");
    if (active) active.classList.remove("is-hover");
    active = null;
  }
  function nearest(px, py) {
    let best = null, bestD = 22 * 22;
    select(svg).selectAll("circle").each(function(d) {
      if (!d || !d.tip || +this.getAttribute("opacity") < 0.3) return;
      const dx = +this.getAttribute("cx") - px, dy = +this.getAttribute("cy") - py;
      const dist = dx * dx + dy * dy;
      if (dist < bestD) {
        bestD = dist;
        best = this;
      }
    });
    return best;
  }
  function show(evt) {
    const box = svg.getBoundingClientRect();
    const px = evt.clientX - box.left, py = evt.clientY - box.top;
    const el = nearest(px, py);
    if (!el) return hide();
    const d = select(el).datum();
    if (active !== el) {
      if (active) active.classList.remove("is-hover");
      active = el;
      tip.replaceChildren();
      const b = document.createElement("b");
      b.textContent = d.tip.title;
      tip.appendChild(b);
      for (const line of d.tip.lines || []) {
        const s = document.createElement("span");
        s.textContent = line;
        tip.appendChild(s);
      }
    }
    const cx = +el.getAttribute("cx"), cy = +el.getAttribute("cy");
    const w = tip.offsetWidth, h = tip.offsetHeight, W = stage.clientWidth;
    let left = cx - w / 2, top = cy - h - 12;
    if (top < 0) top = cy + 14;
    left = Math.max(0, Math.min(W - w, left));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.classList.add("is-on");
  }
  svg.addEventListener("pointermove", show);
  svg.addEventListener("pointerdown", show);
  svg.addEventListener("pointerleave", hide);
  window.addEventListener("scroll", hide, { passive: true });
  return { hide };
}
