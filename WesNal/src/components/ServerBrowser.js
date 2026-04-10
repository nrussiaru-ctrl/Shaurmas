import { getState, updateServerStatus, dispatch } from '../stores/state.js';

export class ServerBrowser {
  constructor(container) {
    this.container = container;
    this.state = getState();
    this.pollInterval = null;
    
    this.render();
    this.attachEventListeners();
    this.startPolling();
  }

  render() {
    this.container.innerHTML = `
      <div class="server-browser">
        <form class="add-server-form">
          <input type="text" class="add-server-input" id="server-ip-input" placeholder="IP сервера (например: hypixel.net)" />
          <button type="submit" class="btn-primary">Добавить</button>
        </form>
        <div class="servers-grid scroll-container"></div>
      </div>
    `;

    this.serversGrid = this.container.querySelector('.servers-grid');
    this.serverIpInput = this.container.querySelector('#server-ip-input');
    this.addForm = this.container.querySelector('.add-server-form');

    this.renderServers();
  }

  attachEventListeners() {
    this.addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAddServer();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.stopPolling();
      } else {
        this.startPolling();
      }
    });
  }

  handleAddServer() {
    const ip = this.serverIpInput.value.trim();
    if (!ip) return;

    const [host, port] = ip.split(':');
    const newServer = {
      ip: host,
      port: port ? parseInt(port) : 25565,
      name: host,
    };

    this.state.servers.push(newServer);
    this.serverIpInput.value = '';
    this.renderServers();
    this.pollServerStatus(newServer);
  }

  startPolling() {
    if (this.pollInterval) return;
    
    this.state.servers.forEach(server => this.pollServerStatus(server));
    this.pollInterval = setInterval(() => {
      this.state.servers.forEach(server => this.pollServerStatus(server));
    }, 15000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async pollServerStatus(server) {
    try {
      const response = await fetch(`https://api.mcsrvstat.us/2/${server.ip}`);
      const data = await response.json();

      let status = 'offline';
      let players = { online: 0, max: 0 };
      let motd = '';

      if (data.online) {
        const ping = data.debug?.ping ?? 999;
        if (ping < 100) {
          status = 'online';
        } else if (ping < 300) {
          status = 'lag';
        } else {
          status = 'online';
        }

        players = {
          online: data.players?.online || 0,
          max: data.players?.max || 0,
        };

        motd = data.motd?.clean?.join('\n') || data.motd?.html?.join('\n') || '';
      }

      updateServerStatus(server.ip, {
        status,
        players,
        motd,
        lastUpdated: Date.now(),
      });

      this.renderServerCard(server);
    } catch (error) {
      console.error(`Failed to poll server ${server.ip}:`, error);
      updateServerStatus(server.ip, {
        status: 'offline',
        players: { online: 0, max: 0 },
        motd: '',
        lastUpdated: Date.now(),
      });
      this.renderServerCard(server);
    }
  }

  renderServers() {
    const servers = this.state.servers;

    if (servers.length === 0) {
      this.serversGrid.innerHTML = `
        <div class="no-servers">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/>
            <line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
          <span>Нет серверов</span>
        </div>
      `;
      return;
    }

    servers.forEach(server => {
      this.renderServerCard(server);
    });
  }

  renderServerCard(server) {
    const existingCard = this.serversGrid.querySelector(`[data-ip="${server.ip}"]`);
    const statusData = this.state.serverStatuses[server.ip] || { status: 'offline', players: { online: 0, max: 0 }, motd: '' };
    const status = statusData.status;
    const players = statusData.players;
    const motd = statusData.motd;

    const playerPercent = players.max > 0 ? (players.online / players.max) * 100 : 0;
    const statusText = status === 'online' ? 'Online' : status === 'lag' ? 'Lag' : 'Offline';
    const statusEmoji = status === 'online' ? '🟢' : status === 'lag' ? '🟡' : '🔴';

    const cardHTML = `
      <div class="server-card ${status}" data-ip="${server.ip}">
        <div class="server-header">
          <span class="server-name">${this.escapeHtml(server.name)}</span>
          <span class="server-status ${status}">
            <span class="status-dot"></span>
            ${statusText}
          </span>
        </div>
        <div class="server-info">
          <span class="server-ip">${server.ip}:${server.port}</span>
          <div class="server-players">
            <span>${players.online}/${players.max} игроков</span>
            <div class="players-bar">
              <div class="players-fill" style="width: ${playerPercent}%"></div>
            </div>
          </div>
          <div class="server-motd">${motd ? this.escapeHtml(motd).replace(/\n/g, '<br>') : '<em>Описание отсутствует</em>'}</div>
        </div>
        <div class="server-actions">
          <button class="connect-btn" ${status === 'offline' ? 'disabled' : ''}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Подключиться
          </button>
          <button class="refresh-btn" title="Обновить">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    if (existingCard) {
      existingCard.outerHTML = cardHTML;
    } else {
      this.serversGrid.insertAdjacentHTML('beforeend', cardHTML);
    }

    this.attachCardListeners(server);
  }

  attachCardListeners(server) {
    const card = this.serversGrid.querySelector(`[data-ip="${server.ip}"]`);
    if (!card) return;

    const connectBtn = card.querySelector('.connect-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        if (server.status !== 'offline') {
          dispatch('server-connect', { ip: server.ip, port: server.port, name: server.name });
        }
      });
    }

    const refreshBtn = card.querySelector('.refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('spinning');
        this.pollServerStatus(server).then(() => {
          setTimeout(() => refreshBtn.classList.remove('spinning'), 1000);
        });
      });
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.innerHTML;
  }

  destroy() {
    this.stopPolling();
  }
}
