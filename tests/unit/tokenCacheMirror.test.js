const assert = require('node:assert/strict');
const { beforeEach, describe, it } = require('node:test');
const Module = require('node:module');

const storage = new Map();
const originalLoad = Module._load;

Module._load = function mockElectron(request, parent, isMain) {
  if (request === 'electron') {
    return {
      safeStorage: {
        isEncryptionAvailable: () => true,
        encryptString: (value) => Buffer.from(`encrypted:${value}`),
        decryptString: (buffer) => buffer.toString().replace(/^encrypted:/, ''),
      },
      ipcRenderer: {
        invoke: async () => ({ success: false, error: 'not used in this test' }),
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

global.localStorage = {
  get length() {
    return storage.size;
  },
  getItem: (key) => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
  key: (index) => [...storage.keys()][index] || null,
};

const TokenCache = require('../../app/browser/tools/tokenCache');

describe('TokenCache localStorage mirror', () => {
  beforeEach(() => {
    storage.clear();
    TokenCache.setLocalStorageMirrorEnabled(true);
  });

  it('mirrors plaintext keys for Teams cold-start account discovery', async () => {
    await TokenCache.setItem('tmp.auth.v1.account', 'token-value');

    assert.equal(storage.get('tmp.auth.v1.account'), 'token-value');
    assert.equal(
      storage.get('secure_teams_tmp.auth.v1.account'),
      Buffer.from('encrypted:token-value').toString('base64')
    );
  });

  it('can disable plaintext mirroring for stricter storage mode', async () => {
    TokenCache.setLocalStorageMirrorEnabled(false);

    await TokenCache.setItem('tmp.auth.v1.account', 'token-value');

    assert.equal(storage.get('tmp.auth.v1.account'), undefined);
    assert.equal(
      storage.get('secure_teams_tmp.auth.v1.account'),
      Buffer.from('encrypted:token-value').toString('base64')
    );
  });
});

Module._load = originalLoad;
