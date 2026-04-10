import { loadVersions, selectVersion, getState, dispatch } from '../stores/state.js';

export class VersionSelector {
  constructor(container) {
    this.container = container;
    this.state = getState();
    this.filter = 'all';
    this.searchQuery = '';
    this.visibleRange = { start: 0, end: 50 };
    this.itemHeight = 68;
    this.debounceTimer = null;
    
    this.render();
    this.attachEventListeners();
    this.loadVersions();
  }

  render() {
    this.container.innerHTML = `
      <div class="version-selector">
        <div class="version-filters">
          <button class="filter-btn active" data-filter="all">Все</button>
          <button class="filter-btn" data-filter="release">Релизы</button>
          <button class="filter-btn" data-filter="snapshot">Снапшоты</button>
          <button class="filter-btn" data-filter="legacy">Архив</button>
        </div>
        <div class="search-container">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" class="search-input" placeholder="Поиск версии..." />
        </div>
        <div class="version-list-container">
          <div class="version-list scroll-container"></div>
        </div>
      </div>
    `;

    this.versionList = this.container.querySelector('.version-list');
    this.searchInput = this.container.querySelector('.search-input');
    this.filterBtns = this.container.querySelectorAll('.filter-btn');

    this.versionList.addEventListener('scroll', () => this.handleScroll());
  }

  attachEventListeners() {
    this.filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filter = e.target.dataset.filter;
        this.renderList();
      });
    });

    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderList();
      }, 150);
    });

    this.container.addEventListener('version-selected', (e) => {
      this.selectVersion(e.detail);
    });
  }

  async loadVersions() {
    this.versionList.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Загрузка версий...</span>
      </div>
    `;

    await loadVersions();
    this.renderList();
  }

  getFilteredVersions() {
    let versions = this.state.versions;

    if (this.filter === 'release') {
      versions = versions.filter(v => v.type === 'release');
    } else if (this.filter === 'snapshot') {
      versions = versions.filter(v => v.type === 'snapshot');
    } else if (this.filter === 'legacy') {
      versions = versions.filter(v => v.complianceLevel === 0);
    }

    if (this.searchQuery) {
      versions = versions.filter(v => 
        v.id.toLowerCase().includes(this.searchQuery)
      );
    }

    return versions;
  }

  handleScroll() {
    const scrollTop = this.versionList.scrollTop;
    const containerHeight = this.versionList.clientHeight;
    const totalHeight = this.versionList.scrollHeight;

    const newStart = Math.floor(scrollTop / this.itemHeight);
    const visibleCount = Math.ceil(containerHeight / this.itemHeight) + 10;
    const newEnd = Math.min(newStart + visibleCount, this.getFilteredVersions().length);

    if (newStart !== this.visibleRange.start || newEnd !== this.visibleRange.end) {
      this.visibleRange = { start: newStart, end: newEnd };
      this.renderVisibleItems();
    }
  }

  renderList() {
    const filtered = this.getFilteredVersions();
    const totalHeight = filtered.length * this.itemHeight;
    
    this.versionList.style.height = `${totalHeight}px`;
    this.visibleRange = { start: 0, end: Math.min(50, filtered.length) };
    this.versionList.scrollTop = 0;

    if (filtered.length === 0) {
      this.versionList.innerHTML = `
        <div class="no-results">
          <span>Версии не найдены</span>
        </div>
      `;
      return;
    }

    this.renderVisibleItems();
  }

  renderVisibleItems() {
    const filtered = this.getFilteredVersions();
    const { start, end } = this.visibleRange;
    const visibleVersions = filtered.slice(start, end);

    const offset = start * this.itemHeight;

    this.versionList.innerHTML = visibleVersions.map((version, index) => {
      const globalIndex = start + index;
      const isSelected = this.state.selectedVersion?.id === version.id;
      const date = new Date(version.releaseTime).toLocaleDateString('ru-RU');
      const typeClass = version.type === 'release' ? 'release' : 
                       version.type === 'snapshot' ? 'snapshot' : 'old_beta';
      const typeName = version.type === 'release' ? 'Release' : 
                      version.type === 'snapshot' ? 'Snapshot' : 'Legacy';

      return `
        <div class="version-item ${isSelected ? 'selected' : ''}" 
             style="transform: translateY(${offset + index * this.itemHeight}px);"
             data-index="${globalIndex}">
          <div class="version-info">
            <span class="version-id">${this.escapeHtml(version.id)}</span>
            <div class="version-meta">
              <span class="version-type ${typeClass}">${typeName}</span>
              <span class="version-date">${date}</span>
            </div>
          </div>
          ${isSelected ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </div>
      `;
    }).join('');

    this.attachItemClickListeners();
  }

  attachItemClickListeners() {
    const items = this.versionList.querySelectorAll('.version-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        const version = this.getFilteredVersions()[index];
        if (version) {
          selectVersion(version);
        }
      });
    });
  }

  selectVersion(version) {
    this.renderList();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
