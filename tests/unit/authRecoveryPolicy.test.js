const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  getAuthRecoveryMode,
  shouldClearAuthStateOnRecovery,
} = require('../../app/mainAppWindow/authRecoveryPolicy');

describe('authRecoveryPolicy', () => {
  it('preserves auth state by default', () => {
    assert.equal(shouldClearAuthStateOnRecovery({}), false);
    assert.equal(getAuthRecoveryMode({}), 'reload-only');
  });

  it('only clears auth state when explicitly enabled', () => {
    const config = {
      auth: {
        clearStorageOnAuthFailure: true,
      },
    };

    assert.equal(shouldClearAuthStateOnRecovery(config), true);
    assert.equal(getAuthRecoveryMode(config), 'clear-and-reload');
  });

  it('does not treat legacy truthy-looking values as opt-in', () => {
    const config = {
      auth: {
        clearStorageOnAuthFailure: 'true',
      },
    };

    assert.equal(shouldClearAuthStateOnRecovery(config), false);
  });
});
