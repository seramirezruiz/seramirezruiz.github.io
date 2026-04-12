/**
 * Teaching page renderer
 * Loads course data from JSON and renders to the page
 */

(function() {
  'use strict';

  /**
   * Render a materials link for a course
   */
  function renderLinks(links) {
    if (!links || !links.materials) {
      return '';
    }
    return `<span class="paper-links"><span class="paper-link"><i class="fas fa-book-open" style="color:#696969"></i> <a href="${links.materials}" target="_blank">Course materials</a></span></span>`;
  }

  /**
   * Render an instructor course entry
   */
  function renderInstructorCourse(course, index, array) {
    const upcomingBadge = course.upcoming
      ? '<span class="teaching-upcoming">upcoming</span> '
      : '';
    const linksHtml = renderLinks(course.links);
    const isLast = index === array.length - 1;

    return `
      <li>
        ${upcomingBadge}<b>${course.title}</b>, ${course.date}<br>
        <span class="text-muted">${course.institution}, ${course.location}</span>
        ${linksHtml ? '<br>' + linksHtml : ''}
      </li>
      ${isLast ? '' : '<hr>'}`;
  }

  /**
   * Render a teaching assistant course entry
   */
  function renderTACourse(course, index, array) {
    const linksHtml = renderLinks(course.links);
    const isLast = index === array.length - 1;

    return `
      <li>
        <b>${course.title}</b>, ${course.institution}<br>
        <span class="text-muted">${course.terms}</span>
        ${linksHtml ? '<br>' + linksHtml : ''}
      </li>
      ${isLast ? '' : '<hr>'}`;
  }

  /**
   * Initialize the teaching page
   */
  function init() {
    fetch('data/teaching.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load teaching data');
        }
        return response.json();
      })
      .then(data => {
        const instructorContainer = document.getElementById('instructor-list');
        if (instructorContainer && data.instructor) {
          instructorContainer.innerHTML = data.instructor
            .map(renderInstructorCourse)
            .join('');
        }

        const taContainer = document.getElementById('ta-list');
        if (taContainer && data.teachingAssistant) {
          taContainer.innerHTML = data.teachingAssistant
            .map(renderTACourse)
            .join('');
        }
      })
      .catch(error => {
        console.error('Error loading teaching data:', error);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
