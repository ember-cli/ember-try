var assert        = require('assert');
var fs            = require('fs');
var RSVP          = require('rsvp');
var _rimraf       = require('rimraf');
var spawnSync     = require('child_process').spawnSync;

var fixtureBower  = require('../fixtures/bower.json');

var rimraf        = RSVP.denodeify(_rimraf);
var mkdir         = RSVP.denodeify(fs.mkdir);
var writeFile     = RSVP.denodeify(fs.writeFile);
var readFile      = RSVP.denodeify(fs.readFile);


function MockProject(root) {
  assert.equal(!!root, true, 'Must provide a root');
  this.projectRoot = root;
}

MockProject.prototype = {
  setup: function () {
    var mockProj = this;
    return rimraf(mockProj.projectRoot).then(function () {
      return mkdir(mockProj.projectRoot).then(function () {
        return writeFile(mockProj.projectRoot + '/bower.json', JSON.stringify(fixtureBower)).then(function () {
          return spawnSync('bower', ['install'], {
            cwd: mockProj.projectRoot
          });
        });
      });
    });
  },

  destroy: function () {
    return rimraf(this.projectRoot);
  },

  bowerData: function() {
    return readFile(this.projectRoot + '/bower.json').then(function(fileData) {
      return JSON.parse(fileData);
    });
  },

  backupBowerData: function () {
    return readFile(this.projectRoot + '/bower.json.ember-try').then(function(fileData) {
      return JSON.parse(fileData);
    });
  },

  createBowerBackup: function (packageVersions) {
    var vers = packageVersions || {};
    var mockProj = this;
    return this.bowerData().then(function(bowerJson){
      for(var k in vers) {
        bowerJson.dependencies[k] = vers[k];
      }
      return writeFile(mockProj.projectRoot + '/bower.json.ember-try', JSON.stringify(bowerJson));
    });
  }
};

module.exports = MockProject;
