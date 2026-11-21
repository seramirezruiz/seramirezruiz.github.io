export function initNav() {
  const btn = document.querySelector("#mainNav .navbar-toggler");
  const menu = document.getElementById("navbarResponsive");
  if (!btn || !menu) return;
  btn.addEventListener("click", () => {
    const open = menu.classList.toggle("show");
    btn.setAttribute("aria-expanded", String(open));
  });
}
