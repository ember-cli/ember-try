import { expect } from 'chai';
import run from '../../lib/utils/run.js';

describe('utils/run', () => {
  it('rejects if command exits non-zero', () => {
    return run('exit 1', [], {})
      .then(() => {
        expect(true).to.equal(false, 'Should not succeed');
      })
      .catch((res) => {
        expect(res).to.equal(1, 'Should reject with exit code');
      });
  });
});
