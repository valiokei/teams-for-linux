'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

// We test the pure helper functions without Electron APIs.
const { redactUrl, redactEmail } = require('../../app/browser/tools/authDiagnosticsHelpers');

describe('authDiagnostics redactUrl', () => {
  it('removes query parameters from a Teams URL', () => {
    const input = 'https://teams.cloud.microsoft/?tenantId=abc123&correlation=xyz';
    const result = redactUrl(input);
    assert.strictEqual(result, 'https://teams.cloud.microsoft/');
  });

  it('removes fragments from a URL', () => {
    const input = 'https://teams.microsoft.com/l/chat/0/0#section';
    const result = redactUrl(input);
    assert.strictEqual(result, 'https://teams.microsoft.com/l/chat/0/0');
  });

  it('preserves pathname for login URLs', () => {
    const input = 'https://login.microsoftonline.com/common/oauth2/authorize?client_id=abc&redirect_uri=https://teams.cloud.microsoft';
    const result = redactUrl(input);
    assert.strictEqual(result, 'https://login.microsoftonline.com/common/oauth2/authorize');
  });

  it('handles empty string', () => {
    const result = redactUrl('');
    assert.strictEqual(result, '[empty]');
  });

  it('handles non-URL strings gracefully', () => {
    const result = redactUrl('not-a-url-at-all');
    assert.ok(result.startsWith('[unparseable:'));
  });

  it('handles about:blank', () => {
    const result = redactUrl('about:blank');
    assert.strictEqual(result, 'about:blank');
  });

  it('handles chrome-error URLs', () => {
    const result = redactUrl('chrome-error://chromewebdata/');
    assert.strictEqual(result, 'chrome-error://chromewebdata/');
  });
});

describe('authDiagnostics redactEmail', () => {
  it('masks the local part of an email', () => {
    const result = redactEmail('john.doe@example.com');
    assert.strictEqual(result, 'j***@example.com');
  });

  it('handles single-character local parts', () => {
    const result = redactEmail('a@example.com');
    assert.strictEqual(result, 'a***@example.com');
  });

  it('returns [not-an-email] for strings without @', () => {
    const result = redactEmail('not-an-email');
    assert.strictEqual(result, '[not-an-email]');
  });

  it('returns [empty] for empty string', () => {
    const result = redactEmail('');
    assert.strictEqual(result, '[empty]');
  });

  it('returns [not-an-email] for @ at start', () => {
    const result = redactEmail('@example.com');
    assert.strictEqual(result, '[not-an-email]');
  });
});
