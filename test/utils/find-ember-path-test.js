'use strict';

const expect = require('chai').expect;
const findEmberPath = require('../../lib/utils/find-ember-path');

describe('findEmberPath()', () => {
  it('refers to the ember-cli in node_modules', () => {
    return findEmberPath('.').then((emberPath) => {
      expect(emberPath.indexOf('/node_modules/ember-cli/bin/ember')).to.be.above(0);
    });
  });
});
