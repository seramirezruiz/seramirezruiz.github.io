export function createScrolly({ steps, trigger = () => 0.5, onStep }) {
  let current = -1;
  let frame = 0;
  let progress = 0;
  let size = `${window.innerWidth}x${window.innerHeight}`;
  const sizeChanged = () => `${window.innerWidth}x${window.innerHeight}` !== size;
  function activeIndex() {
    const line = window.innerHeight * trigger();
    let idx = 0;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].getBoundingClientRect().top <= line) idx = i;
      else break;
    }
    return idx;
  }
  function measureProgress(idx) {
    const r = steps[idx].getBoundingClientRect();
    const line = window.innerHeight * trigger();
    return Math.max(0, Math.min(1, (line - r.top) / Math.max(1, r.height)));
  }
  function update({ force = false, instant = false } = {}) {
    frame = 0;
    if (sizeChanged()) return;
    const idx = activeIndex();
    progress = measureProgress(idx);
    if (idx === current && !force) return;
    const previous = current;
    current = idx;
    steps.forEach((el, i) => el.classList.toggle("is-active", i === idx));
    onStep({ index: idx, step: steps[idx], previous, animate: !instant && previous !== -1 && Math.abs(idx - previous) === 1 });
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => update());
  };
  window.addEventListener("scroll", schedule, { passive: true });
  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      size = `${window.innerWidth}x${window.innerHeight}`;
      if (current < 0) return update({ force: true, instant: true });
      const r = steps[current].getBoundingClientRect();
      const line = window.innerHeight * trigger();
      window.scrollTo(0, window.scrollY + r.top + progress * r.height - line + 1);
      update({ force: true, instant: true });
    }, 60);
  });
  window.addEventListener("hashchange", () => requestAnimationFrame(() => update({ instant: true })));
  update({ force: true, instant: true });
  return { get index() {
    return current;
  }, refresh: () => update({ force: true, instant: true }), destroy() {
    window.removeEventListener("scroll", schedule);
  } };
}
