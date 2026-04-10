import { getState, dispatch, selectVersion, updateSettings } from './stores/state.js';
import { VersionSelector } from './components/VersionSelector.js';
import { AccountSwitcher } from './components/AccountSwitcher.js';
import { ServerBrowser } from './components/ServerBrowser.js';
import { SettingsPanel } from './components/SettingsPanel.js';

class App {
  constructor() {
    this.state = getState();
    this.components = {};
    
    this.init();
  }

  async init() {
    this.setupNavigation();
    this.setupComponents();
    this.setupLaunchButton();
    this.setupEventListeners();
    this.applyTheme();
    
    await this.loadInitialData();
  }

  setupNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const panels = {
      versions: document.getElementById('versions-panel'),
      accounts: document.getElementById('accounts-panel'),
      servers: document.getElementById('servers-panel'),
      settings: document.getElementById('settings-panel'),
    };

    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const panelName = tab.dataset.panel;
        
        navTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        Object.keys(panels).forEach(key => {
          panels[key].classList.remove('active');
        });
        panels[panelName].classList.add('active');

        if (panelName === 'accounts') {
          document.querySelector('.sidebar').style.display = 'none';
        } else {
          document.querySelector('.sidebar').style.display = 'flex';
        }
      });
    });
  }

  setupComponents() {
    const versionsPanel = document.getElementById('versions-panel');
    const accountPanel = document.getElementById('account-panel');
    const serversPanel = document.getElementById('servers-panel');
    const settingsPanel = document.getElementById('settings-panel');

    this.components.versionSelector = new VersionSelector(versionsPanel);
    this.components.accountSwitcher = new AccountSwitcher(accountPanel);
    this.components.serverBrowser = new ServerBrowser(serversPanel);
    this.components.settingsPanel = new SettingsPanel(settingsPanel);
  }

  setupLaunchButton() {
    const launchBtn = document.getElementById('launch-btn');
    
    launchBtn.addEventListener('click', async () => {
      await this.handleLaunch();
    });
  }

  setupEventListeners() {
    window.addEventListener('version-selected', (e) => {
      this.updateStatus(`Выбрана версия: ${e.detail.id}`, 'online');
    });

    window.addEventListener('account-changed', (e) => {
      if (e.detail) {
        this.updateStatus(`Аккаунт: ${e.detail.username}`, 'online');
      }
    });

    window.addEventListener('server-connect', async (e) => {
      const { ip, port, name } = e.detail;
      
      const isOnline = await this.pingServer(ip, port);
      
      if (isOnline) {
        this.showToast(`Подключение к ${name}...`, 'success');
        await this.handleLaunch({ ip, port });
      } else {
        this.showToast(`Сервер ${name} оффлайн`, 'error');
        this.updateStatus('Сервер недоступен', 'offline');
      }
    });

    window.addEventListener('settings-updated', (e) => {
      if (e.detail.theme) {
        this.applyTheme();
      }
    });

    window.addEventListener('error', (e) => {
      this.showToast(e.detail.message, 'error');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.cleanup();
      }
    });
  }

  async loadInitialData() {
    this.updateStatus('Загрузка...', 'online');
  }

  async handleLaunch(serverInfo = null) {
    const { selectedVersion, currentAccount, settings } = this.state;

    if (!currentAccount) {
      this.showToast('Выберите аккаунт', 'warning');
      return;
    }

    if (!selectedVersion) {
      this.showToast('Выберите версию Minecraft', 'warning');
      return;
    }

    this.setLaunching(true);
    this.updateStatus('Запуск...', 'online');

    try {
      const launchArgs = {
        versionId: selectedVersion.id,
        accountId: currentAccount.id,
        username: currentAccount.username,
        uuid: currentAccount.uuid || currentAccount.id,
        ramMB: settings.ramAllocation,
        javaPath: settings.javaPath || null,
        serverIp: serverInfo?.ip || null,
        serverPort: serverInfo?.port || null,
      };

      const result = await window.__TAURI__.invoke('launch_game', launchArgs);
      
      this.showToast('Игра запущена!', 'success');
      this.updateStatus('Игра работает', 'online');
    } catch (error) {
      console.error('Launch failed:', error);
      this.showToast(`Ошибка запуска: ${error.message}`, 'error');
      this.updateStatus('Ошибка запуска', 'offline');
    } finally {
      this.setLaunching(false);
    }
  }

  async pingServer(ip, port) {
    try {
      const result = await window.__TAURI__.invoke('ping_server', { ip, port });
      return result.success;
    } catch (error) {
      console.error('Ping failed:', error);
      return false;
    }
  }

  setLaunching(isLaunching) {
    const launchBtn = document.getElementById('launch-btn');
    launchBtn.disabled = isLaunching;
    
    if (isLaunching) {
      launchBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        Запуск...
      `;
    } else {
      launchBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        Запустить
      `;
    }
  }

  updateStatus(text, status) {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    statusText.textContent = text;
    statusIndicator.className = `status-indicator ${status}`;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s reverse forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  applyTheme() {
    const theme = this.state.settings.theme;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    const useBlur = navigator.hardwareConcurrency > 2;
    if (!useBlur) {
      document.documentElement.style.setProperty('--blur', '0px');
    }
  }

  cleanup() {
    if (this.components.serverBrowser) {
      this.components.serverBrowser.destroy();
    }
  }
}

const app = new App();
