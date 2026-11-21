import { createScrolly } from "./scrolly.js";
import { renderMarks } from "./charts/marks.js";
import { attachTooltip } from "./charts/tooltip.js";
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;
export async function mountStory(createGraphic, dataUrls = {}) {
  const root = document.querySelector("[data-scrolly]");
  if (!root) return;
  const figure = root.querySelector(".scrolly__graphic");
  const stage = figure.querySelector(".g-stage");
  const svg = stage.querySelector(".g-svg");
  const htmlLayer = stage.querySelector(".g-html");
  const capTitle = figure.querySelector(".g-caption__title");
  const capNote = figure.querySelector(".g-caption__note");
  const steps = Array.from(root.querySelectorAll(".step"));
  const entries = await Promise.all(Object.entries(dataUrls).map(async ([k, url]) => [k, await (await fetch(url)).json()]));
  const data = Object.fromEntries(entries);
  const graphic = createGraphic({ data, htmlLayer });
  root.addEventListener("click", (e) => {
    if (!e.target.closest("[data-graphic-focus]")) return;
    const target = [...htmlLayer.children].find((c) => !c.hidden)?.querySelector("button, a[href], input, select, [tabindex]");
    target?.focus({ preventScroll: true });
  });
  let size = measure();
  let currentState = null;
  attachTooltip(stage, svg);
  function measure() {
    const r = stage.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), desktop: isDesktop() };
  }
  function setCaption(cap) {
    capTitle.textContent = cap?.title || "";
    capNote.replaceChildren();
    for (const item of cap?.note || []) {
      if (typeof item === "string") {
        capNote.append(item);
        continue;
      }
      const span = document.createElement("span");
      span.className = "key";
      const sw = document.createElement("i");
      sw.className = `key-${item.swatch}`;
      sw.setAttribute("aria-hidden", "true");
      span.append(sw, item.text);
      capNote.append(span);
    }
  }
  function draw(stateName, animate) {
    const spec = graphic.state(stateName, size);
    const duration = animate && !reduceMotion() ? spec.duration ?? 900 : 0;
    figure.dataset.state = stateName;
    setCaption(spec.caption);
    for (const el of htmlLayer.children) {
      const on = el.dataset.states?.split(" ").includes(stateName);
      el.hidden = !on;
      el.inert = !on;
    }
    spec.enter?.(htmlLayer, size);
    renderMarks(svg, spec.marks || [], { duration });
    currentState = stateName;
  }
  const scrolly = createScrolly({ steps, trigger: () => isDesktop() ? 0.55 : 0.8, onStep: ({ step, animate }) => draw(step.dataset.state, animate) });
  let resizeTimer = 0;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const next = measure();
      if (next.w === size.w && next.h === size.h) return;
      size = next;
      if (currentState) draw(currentState, false);
      scrolly.refresh();
    }, 80);
  }).observe(stage);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => currentState && draw(currentState, false));
  document.documentElement.classList.add("is-mounted");
  return { scrolly, draw };
}
