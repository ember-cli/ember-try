var bowerHelpers = require('../lib/utils/bower-helpers');
var should = require("should");
var path = require('path');
var fs = require('fs');

var MockProject = require('./helpers/mock-project');

describe('bowerHelpers', function(){
  var proj = null;
  beforeEach(function () {
    proj = new MockProject('.scratch');
    return proj.setup();
  });

  afterEach(function() {
    return proj.destroy();
  });

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

    it('should replace a bower.json with the bower.json.ember-try', function(done) {
      proj.createBowerBackup({
        dependencies: {
          jquery: '2.1.3'
        }
      }).then(function() {
        bowerHelpers.resetBowerFile(proj.projectRoot).then(function () {
          proj.bowerData().then(function(data) {
            data.dependencies.jquery.should.equal('2.1.3');
            done();
          });
        });
      });
    });
  });

  describe('#cleanup()', function() {
    // actual bower install could take a while
    this.timeout(60000);



    it('should cleanup the bower situation in a test scenario', function(done) {
      proj.createBowerBackup({
        dependencies: {
          jquery: '2.1.3'
        }
      }).then(function() {
        proj.backupBowerData().then(function(bbd) {
          bbd.dependencies.jquery.should.equal('2.1.3');
          bowerHelpers.cleanup(proj.projectRoot).then(function() {
            proj.bowerData().then(function(bowerData) {
              bowerData.dependencies.jquery.should.equal('2.1.3');
              done();
            });
          });
        });
      });
    });
  });

  describe('#backupBowerFile()', function() {
    // actual bower install could take a while
    this.timeout(10000);

    it('should copy bower.json to bower.json.ember-try', function(done) {
      proj.createBowerBackup({
          dependencies: {
            'jquery': '2.1.3'
          }
        }).then(function() {
        bowerHelpers.backupBowerFile(proj.projectRoot).then(function () {
          proj.backupBowerData().then(function(bowerData) {
            bowerData.dependencies.jquery.should.equal('^1.11.1');
            done();
          });
        });
      });
    });
  });
});
