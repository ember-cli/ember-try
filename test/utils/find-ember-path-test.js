'use strict';

var expect        = require('chai').expect;
var findEmberPath = require('../../lib/utils/find-ember-path');

describe('findEmberPath()', function() {
  it('refers to the ember-cli in node_modules', function(done) {

    findEmberPath('.').then(function(emberPath) {
      expect(emberPath.indexOf('/node_modules/ember-cli/bin/ember')).to.be.above(0);
      done();
    });
  });
});
