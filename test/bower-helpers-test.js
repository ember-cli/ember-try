var bowerHelpers = require('../lib/utils/bower-helpers');
var should = require("should");

var MockProject = require('./helpers/mock-project');

describe('bowerHelpers', function(){
  describe('#findBowerPath()', function(){
    it('should return the correct bower path', function(done) {
      bowerHelpers.findBowerPath('.').then(function(path) {
        path.indexOf('node_modules/ember-cli/node_modules/bower/bin/bower').should.be.above(0);
        done();
      }, function(err) {console.log("err", err); });
    });
  });

  describe('#resetBowerFile()', function() {
    // actual bower install could take a while
    this.timeout(10000);

    var proj = new MockProject('.scratch');
    beforeEach(function () {
      return proj.setup();
    });

    afterEach(function() {
      return proj.destroy();
    });

    it('should replace a bower.json with the bower.json.ember-try', function(done) {
      var proj = new MockProject('.scratch');

      proj.createBowerBackup({
        'jquery': '2.1.3'
      }).then(function() {
        bowerHelpers.resetBowerFile(process.cwd() + '/.scratch').then(function () {
          proj.bowerData().then(function(data) {
            data.dependencies.jquery.should.equal('2.1.3');
            done();
          });
        });
      });
    });
  });

  describe('#backupBowerFile()', function() {
    // actual bower install could take a while
    this.timeout(10000);

    var proj = new MockProject('.scratch');
    beforeEach(function () {
      return proj.setup();
    });

    afterEach(function() {
      return proj.destroy();
    });

    it('should copy bower.json to bower.json.ember-try', function(done) {
      proj.createBowerBackup({
        'jquery': '2.1.3'
      }).then(function() {
        bowerHelpers.backupBowerFile(process.cwd() + '/.scratch').then(function () {
          proj.backupBowerData().then(function(bowerData) {
            bowerData.dependencies.jquery.should.equal('^1.11.1');
            done();
          });
        });
      });
    });
  });

})
