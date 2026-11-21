(function(root) {
  "use strict";
  var ITEMS = [{ id: "about", label: "About me", page: "index.html", anchor: "#about", alwaysAnchor: true }, { id: "research", label: "Research", page: "research.html", anchor: "#research" }, { id: "stories", label: "Stories", page: "stories/" }, { id: "teaching", label: "Teaching", page: "teaching.html", anchor: "#teaching" }, { id: "cv", label: "CV", page: "cv.html", anchor: "#cv" }];
  var BARS = '<svg class="nav-bars ml-1" aria-hidden="true" focusable="false" viewBox="0 0 448 512" width="0.875em" height="1em" style="vertical-align:-.125em"><path fill="currentColor" d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"/></svg>';
  function render(o) {
    o = o || {};
    var prefix = o.prefix || "";
    var onHome = o.current === "index";
    var brandHref = onHome ? "#page-top" : prefix + "index.html#page-top";
    var links = ITEMS.map(function(it) {
      var here = o.current === it.id || onHome && it.id === "about";
      var href = here && it.anchor ? it.anchor : prefix + it.page + (it.alwaysAnchor && !here ? it.anchor : "");
      var current = o.current === it.id ? ' aria-current="page"' : "";
      return '<li class="nav-item"><a class="nav-link text-primary" href="' + href + '"' + current + ">" + it.label + "</a></li>";
    }).join("");
    return "<nav" + (o.fixed === false ? "" : ' class="fixed-top"') + ' id="mainNav" aria-label="Site"><div class="container"><a class="navbar-brand text-primary" href="' + brandHref + '">| SRR |</a><button class="navbar-toggler" type="button" aria-controls="navbarResponsive" aria-expanded="false">Menu ' + BARS + '</button><div class="collapse navbar-collapse" id="navbarResponsive"><ul class="navbar-nav ml-auto">' + links + "</ul></div></div></nav>";
  }
  var SiteNav = { items: ITEMS, render };
  if (typeof module !== "undefined" && module.exports) module.exports = SiteNav;
  root.SiteNav = SiteNav;
})(typeof window !== "undefined" ? window : globalThis);
