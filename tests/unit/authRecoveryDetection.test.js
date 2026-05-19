const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  getAuthFailureReason,
  hasAuthFailureSignal,
  hasTrustedAuthSource,
  isWorkerAuthSignal,
} = require('../../app/mainAppWindow/authRecoveryDetection');

describe('authRecoveryDetection auth failure matching', () => {
  it('detects InteractionRequired messages', () => {
    assert.equal(
      getAuthFailureReason({ message: 'InteractionRequired | login_required' }),
      'InteractionRequired'
    );
  });

  it('detects AADSTS50058 silent sign-in failures', () => {
    assert.equal(
      getAuthFailureReason({
        stack: 'Error: login_required: AADSTS50058: A silent sign-in request was sent but no user is signed in.',
      }),
      'login_required'
    );
  });

  it('detects AuthFailed worker errors', () => {
    assert.equal(
      getAuthFailureReason({ message: 'Uncaught Error: UPR: "Error: AuthFailed"' }),
      'AuthFailed'
    );
  });

  it('ignores unrelated renderer noise', () => {
    assert.equal(
      hasAuthFailureSignal({
        message: 'ResizeObserver loop completed with undelivered notifications.',
      }),
      false
    );
  });
});

describe('authRecoveryDetection source checks', () => {
  it('trusts Teams and Microsoft auth sources', () => {
    assert.equal(
      hasTrustedAuthSource({
        filename: 'https://teams.cloud.microsoft/v2/worker/precompiled-web-worker.js',
      }),
      true
    );
    assert.equal(
      hasTrustedAuthSource({
        stack: 'at https://statics.teams.cdn.office.net/teams-modular-packages/auth.js:1:1',
      }),
      true
    );
    assert.equal(
      hasTrustedAuthSource({
        sourceId: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      }),
      true
    );
  });

  it('rejects non-Microsoft sources', () => {
    assert.equal(
      hasTrustedAuthSource({
        filename: 'https://example.com/worker.js',
      }),
      false
    );
  });

  it('identifies worker-originated signals', () => {
    assert.equal(
      isWorkerAuthSignal({
        filename: 'https://teams.cloud.microsoft/v2/worker/precompiled-web-worker.js',
      }),
      true
    );
  });
});
