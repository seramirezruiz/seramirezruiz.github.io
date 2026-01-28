/**
 * Research page renderer
 * Loads paper data from JSON and renders to the page
 */

(function() {
  'use strict';

  /**
   * Generate HTML for paper links (thread, preprint, paper, materials, ungated)
   */
  function renderLinks(links, paperId) {
    if (!links || Object.keys(links).length === 0) {
      return '';
    }

    const linkConfigs = [
      { key: 'thread', icon: 'fa fa-cloud', iconColor: '#87CEEB', label: 'Thread' },
      { key: 'preprint', icon: 'ai ai-osf', iconColor: null, label: 'Preprint' },
      { key: 'paper', icon: 'ai ai-open-access', iconColor: null, label: 'Paper' },
      { key: 'ungated', icon: 'ai ai-osf', iconColor: null, label: 'Ungated' },
      { key: 'materials', icon: 'ai ai-open-data', iconColor: '#696969', label: 'Materials' }
    ];

    const parts = [];

    linkConfigs.forEach(config => {
      if (links[config.key]) {
        const iconStyle = config.iconColor ? ` style="color:${config.iconColor}"` : '';
        parts.push(
          `<span class="paper-link"><i class="${config.icon}"${iconStyle}></i> ` +
          `<a href="${links[config.key]}" target="_blank">${config.label}</a></span>`
        );
      }
    });

    return parts.join('<span class="paper-link-sep">|</span>');
  }

  /**
   * Generate HTML for abstract toggle and content
   */
  function renderAbstract(abstract, paperId, hasLinksBefore) {
    if (!abstract) {
      return '';
    }

    const separator = hasLinksBefore ? '<span class="paper-link-sep">|</span>' : '';

    return `
      ${separator}
      <span class="paper-link">
        <i class="far fa-file-alt" style="color:#696969"></i>
        <a data-toggle="collapse" href="#abstract-${paperId}" role="button" aria-expanded="false" aria-controls="abstract-${paperId}">Abstract ↓</a>
      </span>
      <div class="collapse" id="abstract-${paperId}">
        <div class="card card-body">${abstract}</div>
      </div>`;
  }

  /**
   * Render a journal publication
   */
  function renderJournalPaper(paper, index, array) {
    let citation = paper.authors;
    if (paper.year) {
      citation += `, ${paper.year}.`;
    } else {
      citation += ',';
    }
    citation += ` <b>${paper.title}</b>`;

    if (paper.journal) {
      citation += `. <i>${paper.journal}</i>`;
      if (paper.journalInfo) {
        citation += ` (${paper.journalInfo})`;
      }
    }

    const linksHtml = renderLinks(paper.links, paper.id);
    const abstractHtml = renderAbstract(paper.abstract, paper.id, linksHtml.length > 0);
    const isLast = index === array.length - 1;

    return `
      <li>
        ${citation}
        <br>
        <span class="paper-links">
          ${linksHtml}${abstractHtml}
        </span>
      </li>
      ${isLast ? '' : '<hr>'}`;
  }

  /**
   * Render a working paper
   */
  function renderWorkingPaper(paper, index, array) {
    let title = paper.title;
    if (paper.coauthors) {
      title += ` (${paper.coauthors})`;
    }

    const linksHtml = renderLinks(paper.links, paper.id);
    const abstractHtml = renderAbstract(paper.abstract, paper.id, linksHtml.length > 0);
    const hasLinks = linksHtml || abstractHtml;
    const isLast = index === array.length - 1;

    return `
      <li>
        ${title}
        ${hasLinks ? `<br><span class="paper-links">${linksHtml}${abstractHtml}</span>` : ''}
      </li>
      ${isLast ? '' : '<hr>'}`;
  }

  /**
   * Initialize the research page
   */
  function init() {
    fetch('data/research.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load research data');
        }
        return response.json();
      })
      .then(data => {
        // Render journal publications
        const journalContainer = document.getElementById('journal-publications-list');
        if (journalContainer && data.journalPublications) {
          journalContainer.innerHTML = data.journalPublications
            .map(renderJournalPaper)
            .join('');
        }

        // Render working papers
        const workingContainer = document.getElementById('working-papers-list');
        if (workingContainer && data.workingPapers) {
          workingContainer.innerHTML = data.workingPapers
            .map(renderWorkingPaper)
            .join('');
        }
      })
      .catch(error => {
        console.error('Error loading research data:', error);
      });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
