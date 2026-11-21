/*
 * Teaching page renderer: turns data/teaching.json into the course lists.
 *
 * It runs at BUILD time (stories/_build/pages.mjs loads it), so teaching.html
 * ships with every course already in the HTML.
 *
 * To add or change a course: edit data/teaching.json, then run `npm run build`
 * in stories/_build. Don't edit teaching.html by hand.
 */
(function (root) {
  "use strict";

  function attr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  function renderLinks(links) {
    if (!links || !links.materials) return "";
    return '\n        <div class="entry__links"><a href="' + attr(links.materials) + '" target="_blank" rel="noopener">Course materials</a></div>';
  }

  function renderInstructorCourse(c) {
    return '      <li class="entry" id="' + attr(c.id) + '">\n' +
      '        <h3 class="entry__title">' + (c.upcoming ? '<span class="pill">Upcoming</span> ' : "") + c.title + "</h3>\n" +
      '        <p class="entry__meta">' + c.date + " · " + c.institution + ", " + c.location + "</p>" +
      renderLinks(c.links) + "\n      </li>";
  }

  function renderTACourse(c) {
    return '      <li class="entry" id="' + attr(c.id) + '">\n' +
      '        <h3 class="entry__title">' + c.title + "</h3>\n" +
      '        <p class="entry__meta">' + c.institution + " · " + c.terms + "</p>" +
      renderLinks(c.links) + "\n      </li>";
  }

  /** @returns {{ instructor: string, assistant: string }} the <li> lists */
  function render(data) {
    return {
      instructor: (data.instructor || []).map(renderInstructorCourse).join("\n"),
      assistant: (data.teachingAssistant || []).map(renderTACourse).join("\n")
    };
  }

  var Teaching = { render: render };
  if (typeof module !== "undefined" && module.exports) module.exports = Teaching;
  root.Teaching = Teaching;
})(typeof window !== "undefined" ? window : globalThis);
