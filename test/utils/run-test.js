'use strict';

const expect = require('chai').expect;

describe('utils/run', () => {
  it('rejects if command exits non-zero', () => {
    let run = require('../../lib/utils/run');

    return run('exit 1', [], {}).then(() => {
      expect(true).to.equal(false, 'Should not succeed');
    }).catch((res) => {
      expect(res).to.equal(1, 'Should reject with exit code');
    });
  });
});
