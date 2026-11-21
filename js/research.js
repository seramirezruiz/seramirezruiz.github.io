/*
 * Research page renderer: turns data/research.json into the paper lists.
 *
 * It runs at BUILD time (stories/_build/pages.mjs loads it, the same way it
 * loads js/site-nav.js), so research.html ships with every paper already in the
 * HTML: it works without JavaScript and nothing jumps while loading.
 *
 * To add or change a paper: edit data/research.json, then run `npm run build`
 * in stories/_build. Don't edit research.html by hand.
 *
 * Fields are rendered as they are in the data. `authors`, `title`, and
 * `abstract` may contain simple HTML (e.g. <i>…</i> marks your own name).
 */
(function (root) {
  "use strict";

  // Text links under each paper, in this order. Everything but the story opens in a new tab.
  var LINKS = [
    { key: "paper", label: "Paper" },
    { key: "ungated", label: "Ungated" },
    { key: "preprint", label: "Preprint" },
    { key: "materials", label: "Materials" },
    { key: "thread", label: "Thread" }
  ];

  function attr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  function renderLinks(paper) {
    var l = paper.links || {};
    var parts = [];
    if (l.story) parts.push('<a class="story-mark" href="' + attr(l.story) + '">Story</a>');
    LINKS.forEach(function (c) {
      if (l[c.key]) parts.push('<a href="' + attr(l[c.key]) + '" target="_blank" rel="noopener">' + c.label + "</a>");
    });
    if (paper.abstract) {
      parts.push('<details class="abs"><summary>Abstract</summary><p>' + paper.abstract + "</p></details>");
    }
    return parts.length ? '\n        <div class="entry__links">' + parts.join("") + "</div>" : "";
  }

  function renderJournalPaper(p) {
    var journal = p.journal ? " <i>" + p.journal + "</i>" + (p.journalInfo ? " " + p.journalInfo : "") : "";
    return '      <li class="entry" id="' + attr(p.id) + '">\n' +
      '        <h3 class="entry__title">' + p.title + "</h3>\n" +
      '        <p class="entry__meta"><span class="authors">' + p.authors + "</span>" +
      (p.year ? " (" + p.year + ")." : ".") + journal + "</p>" +
      renderLinks(p) + "\n      </li>";
  }

  function renderWorkingPaper(p) {
    var co = p.coauthors ? p.coauthors.charAt(0).toUpperCase() + p.coauthors.slice(1) : "";
    return '      <li class="entry" id="' + attr(p.id) + '">\n' +
      '        <h3 class="entry__title">' + p.title + "</h3>" +
      (co ? '\n        <p class="entry__meta">' + co + "</p>" : "") +
      renderLinks(p) + "\n      </li>";
  }

  /** @returns {{ publications: string, working: string }} the <li> lists */
  function render(data) {
    return {
      publications: (data.journalPublications || []).map(renderJournalPaper).join("\n"),
      working: (data.workingPapers || []).map(renderWorkingPaper).join("\n")
    };
  }

  var Research = { render: render };
  if (typeof module !== "undefined" && module.exports) module.exports = Research;
  root.Research = Research;
})(typeof window !== "undefined" ? window : globalThis);
