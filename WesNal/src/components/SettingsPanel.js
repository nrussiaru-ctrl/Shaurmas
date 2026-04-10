import { getState, updateSettings, dispatch } from '../stores/state.js';

export class SettingsPanel {
  constructor(container) {
    this.container = container;
    this.state = getState();
    this.debounceTimer = null;
    
    this.render();
    this.attachEventListeners();
    this.updatePreview();
  }

  render() {
    this.container.innerHTML = `
      <div class="settings-panel">
        <div class="settings-content scroll-container">
          <div class="settings-main">
            <div class="settings-section">
              <h3 class="section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Внешний вид
              </h3>
              <div class="theme-options">
                <div class="theme-option ${this.state.settings.theme === 'dark' ? 'selected' : ''}" data-theme="dark">
                  <div class="theme-icon dark">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                  </div>
                  <span class="theme-name">Тёмная</span>
                </div>
                <div class="theme-option ${this.state.settings.theme === 'light' ? 'selected' : ''}" data-theme="light">
                  <div class="theme-icon light">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="5"/>
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                    </svg>
                  </div>
                  <span class="theme-name">Светлая</span>
                </div>
                <div class="theme-option ${this.state.settings.theme === 'system' ? 'selected' : ''}" data-theme="system">
                  <div class="theme-icon system">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M3 12h18" stroke="currentColor" stroke-width="2"/>
                    </svg>
                  </div>
                  <span class="theme-name">Системная</span>
                </div>
                <div class="theme-option ${this.state.settings.theme === 'high-contrast' ? 'selected' : ''}" data-theme="high-contrast">
                  <div class="theme-icon high-contrast">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  </div>
                  <span class="theme-name">Контрастная</span>
                </div>
              </div>
            </div>

            <div class="settings-section">
              <h3 class="section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Производительность
              </h3>
              <div class="setting-item">
                <div class="setting-label">
                  <span class="setting-name">Выделение памяти</span>
                  <span class="setting-description">Максимальный объём RAM для Minecraft</span>
                </div>
              </div>
              <div class="ram-slider">
                <div class="slider-track" id="ram-slider-track">
                  <div class="slider-fill" style="width: ${this.getRamPercent()}%"></div>
                  <div class="slider-thumb" style="left: ${this.getRamPercent()}%" data-ram="${this.state.settings.ramAllocation}"></div>
                </div>
                <div class="slider-value">
                  <span>1 GB</span>
                  <span id="ram-value">${Math.round(this.state.settings.ramAllocation / 1024)} GB</span>
                  <span>16 GB</span>
                </div>
              </div>
            </div>

            <div class="settings-section">
              <h3 class="section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                </svg>
                Java
              </h3>
              <div class="setting-item">
                <div class="setting-label">
                  <span class="setting-name">Путь к Java</span>
                  <span class="setting-description">Автоматически или указать вручную</span>
                </div>
                <div class="file-input-wrapper">
                  <input type="text" class="file-input" id="java-path-input" value="${this.state.settings.javaPath || 'Автоматически'}" readonly />
                  <button class="browse-btn" id="browse-java-btn">Обзор</button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-preview">
            <div class="preview-container">
              <span class="preview-title">Предпросмотр</span>
              <div class="preview-card">
                <div class="preview-text-line"></div>
                <div class="preview-text-line short"></div>
                <div class="preview-button">Кнопка</div>
                <div class="preview-progress">
                  <div class="preview-progress-fill"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.themeOptions = this.container.querySelectorAll('.theme-option');
    this.ramSliderTrack = this.container.querySelector('#ram-slider-track');
    this.ramValue = this.container.querySelector('#ram-value');
    this.javaPathInput = this.container.querySelector('#java-path-input');
    this.browseJavaBtn = this.container.querySelector('#browse-java-btn');
    this.previewContainer = this.container.querySelector('.preview-container');
  }

  attachEventListeners() {
    this.themeOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.setTheme(option.dataset.theme);
      });
    });

    this.ramSliderTrack.addEventListener('click', (e) => {
      const rect = this.ramSliderTrack.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedPercent = Math.max(6.25, Math.min(100, percent));
      const ramMB = Math.round((clampedPercent / 100) * 16384);
      
      this.updateRamSlider(clampedPercent, ramMB);
    });

    this.browseJavaBtn.addEventListener('click', async () => {
      try {
        const path = await window.__TAURI__.invoke('pick_java_path');
        if (path) {
          this.javaPathInput.value = path;
          updateSettings({ javaPath: path });
        }
      } catch (error) {
        console.error('Failed to pick Java path:', error);
      }
    });
  }

  setTheme(theme) {
    this.themeOptions.forEach(opt => opt.classList.remove('selected'));
    this.container.querySelector(`[data-theme="${theme}"]`).classList.add('selected');
    
    updateSettings({ theme });
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    this.updatePreview();
  }

  getRamPercent() {
    const minRam = 1024;
    const maxRam = 16384;
    return ((this.state.settings.ramAllocation - minRam) / (maxRam - minRam)) * 100;
  }

  updateRamSlider(percent, ramMB) {
    const sliderFill = this.ramSliderTrack.querySelector('.slider-fill');
    const sliderThumb = this.ramSliderTrack.querySelector('.slider-thumb');
    
    sliderFill.style.width = `${percent}%`;
    sliderThumb.style.left = `${percent}%`;
    sliderThumb.dataset.ram = ramMB;
    this.ramValue.textContent = `${Math.round(ramMB / 1024)} GB`;

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      updateSettings({ ramAllocation: ramMB });
    }, 50);
  }

  updatePreview() {
    const theme = this.state.settings.theme;
    let actualTheme = theme;
    
    if (theme === 'system') {
      actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    this.previewContainer.setAttribute('data-theme', actualTheme);
  }
}
