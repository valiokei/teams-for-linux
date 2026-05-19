const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  getResourceLabel,
  normalizeTokenRefreshResources,
} = require('../../app/browser/tools/tokenRefreshResources');

describe('tokenRefreshResources', () => {
  it('prefers current Teams origin and config URL before defaults', () => {
    const resources = normalizeTokenRefreshResources(
      { url: 'https://teams.microsoft.com/v2/?tenant=redacted' },
      'https://teams.cloud.microsoft'
    );

    assert.equal(resources[0], 'https://teams.cloud.microsoft');
    assert.equal(resources[1], 'https://teams.microsoft.com');
  });

  it('includes configured resources once and ignores invalid values', () => {
    const resources = normalizeTokenRefreshResources({
      tokenRefresh: {
        resources: [
          'https://ic3.teams.office.com/path',
          'https://ic3.teams.office.com',
          'http://not-secure.example.com',
          'not a url',
        ],
      },
    });

    assert.equal(
      resources.filter((resource) => resource === 'https://ic3.teams.office.com').length,
      1
    );
    assert.equal(resources.includes('http://not-secure.example.com'), false);
  });

  it('labels resource hostnames without query parameters', () => {
    assert.equal(
      getResourceLabel('https://graph.microsoft.com/v1.0/me?token=secret'),
      'graph.microsoft.com'
    );
  });
});
