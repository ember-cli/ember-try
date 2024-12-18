import { expect } from 'chai';
import findEmberPath from '../../lib/utils/find-ember-path.js';

describe('findEmberPath()', () => {
  it('refers to the ember-cli in node_modules', () => {
    return findEmberPath('.').then((emberPath) => {
      expect(emberPath.indexOf('/node_modules/ember-cli/bin/ember')).to.be.above(0);
    });
  });
});
