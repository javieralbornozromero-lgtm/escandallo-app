// Emula la API window.storage que usa la app dentro de claude.ai, pero respaldada
// en localStorage del navegador/Electron. Así el código de App.jsx no necesita
// ningún cambio para guardar datos fuera de claude.ai.
// Importante: get() lanza un error si la clave no existe (igual que en claude.ai),
// para que loadKey()/saveKey() dentro de App.jsx se comporten exactamente igual.

const PREFIX = "escandallo-app:";

function wrap(key, value, shared) {
  return { key, value, shared: !!shared };
}

window.storage = {
  async get(key, shared = false) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) {
      throw new Error(`No existe la clave: ${key}`);
    }
    return wrap(key, raw, shared);
  },

  async set(key, value, shared = false) {
    localStorage.setItem(PREFIX + key, value);
    return wrap(key, value, shared);
  },

  async delete(key, shared = false) {
    const existed = localStorage.getItem(PREFIX + key) !== null;
    localStorage.removeItem(PREFIX + key);
    return { key, deleted: existed, shared: !!shared };
  },

  async list(prefix = "", shared = false) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey && fullKey.startsWith(PREFIX)) {
        const shortKey = fullKey.slice(PREFIX.length);
        if (!prefix || shortKey.startsWith(prefix)) keys.push(shortKey);
      }
    }
    return { keys, prefix, shared: !!shared };
  },
};
