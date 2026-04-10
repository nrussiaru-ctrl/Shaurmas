const state = {
  versions: [],
  selectedVersion: null,
  accounts: [],
  currentAccount: null,
  servers: [
    { ip: 'hypixel.net', port: 25565, name: 'Hypixel' },
    { ip: 'mineplex.com', port: 25565, name: 'Mineplex' },
    { ip: 'play.cubecraft.net', port: 25565, name: 'CubeCraft' },
  ],
  serverStatuses: {},
  settings: {
    theme: 'dark',
    javaPath: '',
    ramAllocation: 4096,
  },
};

const listeners = {};

export function subscribe(event, callback) {
  if (!listeners[event]) {
    listeners[event] = [];
  }
  listeners[event].push(callback);
  return () => {
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  };
}

export function dispatch(event, detail) {
  if (listeners[event]) {
    listeners[event].forEach(callback => {
      try {
        callback(detail);
      } catch (e) {
        console.error(`Error in listener for ${event}:`, e);
      }
    });
  }
  window.dispatchEvent(new CustomEvent(event, { detail }));
}

export function getState() {
  return state;
}

export function setState(key, value) {
  state[key] = value;
  dispatch('state-changed', { key, value });
}

export function updateState(key, partial) {
  if (typeof state[key] === 'object' && state[key] !== null) {
    state[key] = { ...state[key], ...partial };
  } else {
    state[key] = partial;
  }
  dispatch('state-changed', { key, value: state[key] });
}

export async function loadVersions() {
  try {
    const cached = await window.__TAURI__.invoke('get_cached_versions');
    if (cached) {
      state.versions = cached;
      dispatch('versions-loaded', state.versions);
      return cached;
    }

    const versions = await window.__TAURI__.invoke('fetch_versions');
    state.versions = versions;
    dispatch('versions-loaded', versions);
    return versions;
  } catch (error) {
    console.error('Failed to load versions:', error);
    dispatch('error', { message: 'Failed to load versions' });
    return [];
  }
}

export function selectVersion(version) {
  state.selectedVersion = version;
  dispatch('version-selected', version);
}

export function addAccount(account) {
  state.accounts.push(account);
  if (!state.currentAccount) {
    state.currentAccount = account;
  }
  dispatch('account-added', account);
  dispatch('account-changed', account);
}

export function switchAccount(account) {
  state.currentAccount = account;
  dispatch('account-changed', account);
}

export function removeAccount(accountId) {
  state.accounts = state.accounts.filter(a => a.id !== accountId);
  if (state.currentAccount?.id === accountId) {
    state.currentAccount = state.accounts[0] || null;
    dispatch('account-changed', state.currentAccount);
  }
  dispatch('account-removed', accountId);
}

export function updateServerStatus(ip, status) {
  state.serverStatuses[ip] = status;
  dispatch('server-status-updated', { ip, status });
}

export function updateSettings(settings) {
  state.settings = { ...state.settings, ...settings };
  dispatch('settings-updated', state.settings);
}
