var findEmberPath = require('../lib/utils/find-ember-path');
var should = require("should");

describe('findEmberPath()', function(){
  it('should refer to the ember-cli in node_modules', function (done) {

    findEmberPath('.').then(function (emberPath) {
      emberPath.indexOf('/node_modules/ember-cli/bin/ember').should.be.above(0);
      done();
    });
  })
})
