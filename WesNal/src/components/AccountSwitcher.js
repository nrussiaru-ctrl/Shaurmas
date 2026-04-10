import { addAccount, switchAccount, removeAccount, getState, dispatch } from '../stores/state.js';

export class AccountSwitcher {
  constructor(container) {
    this.container = container;
    this.state = getState();
    this.accountType = 'offline';
    
    this.render();
    this.attachEventListeners();
    this.renderAccountsList();
  }

  render() {
    this.container.innerHTML = `
      <div class="account-switcher">
        <div class="accounts-list scroll-container"></div>
        <div class="add-account-section">
          <div class="account-type-selector">
            <div class="type-option selected" data-type="offline">Offline</div>
            <div class="type-option" data-type="microsoft">Microsoft</div>
          </div>
          <form class="add-account-form">
            <div class="form-group">
              <label class="form-label">Никнейм</label>
              <input type="text" class="form-input" id="username-input" placeholder="Введите никнейм" maxlength="16" />
              <span class="error-message" id="username-error">Некорректный никнейм (3-16 символов, a-z A-Z 0-9 _)</span>
            </div>
            <button type="submit" class="btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Добавить аккаунт
            </button>
          </form>
        </div>
      </div>
    `;

    this.accountsList = this.container.querySelector('.accounts-list');
    this.usernameInput = this.container.querySelector('#username-input');
    this.usernameError = this.container.querySelector('#username-error');
    this.typeOptions = this.container.querySelectorAll('.type-option');
    this.form = this.container.querySelector('.add-account-form');
  }

  attachEventListeners() {
    this.typeOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.typeOptions.forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        this.accountType = option.dataset.type;
      });
    });

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddAccount();
    });

    this.container.addEventListener('account-changed', () => {
      this.renderAccountsList();
    });
  }

  validateUsername(username) {
    const regex = /^[a-zA-Z0-9_]{3,16}$/;
    return regex.test(username);
  }

  generateUUIDv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  handleAddAccount() {
    const username = this.usernameInput.value.trim();
    
    if (!this.validateUsername(username)) {
      this.usernameError.classList.add('visible');
      this.usernameInput.classList.add('error');
      return;
    }

    this.usernameError.classList.remove('visible');
    this.usernameInput.classList.remove('error');

    const account = {
      id: this.generateUUIDv4(),
      username: username,
      type: this.accountType,
      uuid: this.accountType === 'offline' ? this.generateUUIDv4() : null,
      avatar: this.accountType === 'offline' 
        ? `https://crafatar.com/avatars/${this.generateUUIDv4()}?size=48&overlay`
        : null,
    };

    addAccount(account);
    this.usernameInput.value = '';
    this.renderAccountsList();
  }

  renderAccountsList() {
    const accounts = this.state.accounts;

    if (accounts.length === 0) {
      this.accountsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <span>Нет аккаунтов</span>
        </div>
      `;
      return;
    }

    this.accountsList.innerHTML = accounts.map(account => {
      const isSelected = this.state.currentAccount?.id === account.id;
      const avatarUrl = account.avatar || `https://crafatar.com/avatars/${account.uuid || account.id}?size=48&overlay`;

      return `
        <div class="account-item ${isSelected ? 'selected' : ''}" data-id="${account.id}">
          <img class="account-avatar" src="${avatarUrl}" alt="${account.username}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22var(--bg-tertiary)%22><rect width=%2224%22 height=%2224%22/></svg>'" />
          <div class="account-info">
            <span class="account-name">${this.escapeHtml(account.username)}</span>
            <span class="account-type">${account.type === 'microsoft' ? 'Microsoft' : 'Offline'}</span>
          </div>
          <div class="account-actions">
            ${!isSelected ? `
              <button class="action-btn" title="Выбрать">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
            ` : ''}
            <button class="action-btn delete" title="Удалить">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.attachAccountListeners();
  }

  attachAccountListeners() {
    const items = this.accountsList.querySelectorAll('.account-item');
    
    items.forEach(item => {
      const accountId = item.dataset.id;
      
      const selectBtn = item.querySelector('.action-btn:not(.delete)');
      if (selectBtn) {
        selectBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const account = this.state.accounts.find(a => a.id === accountId);
          if (account) {
            switchAccount(account);
          }
        });
      }

      const deleteBtn = item.querySelector('.action-btn.delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          removeAccount(accountId);
        });
      }

      item.addEventListener('click', () => {
        const account = this.state.accounts.find(a => a.id === accountId);
        if (account && !this.state.currentAccount?.id === accountId) {
          switchAccount(account);
        }
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
