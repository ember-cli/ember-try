var assert        = require('assert');
var fs            = require('fs');
var path          = require('path');
var RSVP          = require('rsvp');
var _rimraf       = require('rimraf');
var spawnSync     = require('child_process').spawnSync;

var fixtureBower  = require('../fixtures/bower.json');
var fixtureNpm    = require('../fixtures/package.json');

var rimraf        = RSVP.denodeify(_rimraf);
var mkdir         = RSVP.denodeify(fs.mkdir);
var writeFile     = RSVP.denodeify(fs.writeFile);
var readFile      = RSVP.denodeify(fs.readFile);


function MockProject(root) {
  assert.equal(!!root, true, 'Must provide a root');
  this.projectRoot = root + '-' + Math.round(Math.random() * 10000000);
}

/**
 A "page object" of sorts, for building and managing a simple JavaScript project.
 The aim is to make it easy to setup and run test scenarios involving bower and npm

 It aims to make the following things easy:
 * project setup/teardown
 * seeding the project with fixture data (i.e., a package.json and/or bower.json)
 * running "npm install"
 * running "bower install"

 Additionally, it does one thing specific to ember-try:
 * allow users to setup a test scenario, where the (bower|package).json.ember-try
    is in a specified state

*/
MockProject.prototype = {
  _writeFixtureDataToProject: function (fixture, filename) {
    return writeFile(this.projectRoot + '/' + filename, JSON.stringify(fixture, null, 2));
  },

  _setupBower: function () {
    this._writeFixtureDataToProject(fixtureBower, 'bower.json').then(function () {
      return spawnSync('bower', ['install'], {
        cwd: this.projectRoot
      }.bind(this));
    });
  },
  _setupNpm: function () {
    this._writeFixtureDataToProject(fixtureNpm, 'package.json').then(function () {
      return spawnSync('npm', ['install'], {
        cwd: this.projectRoot
      }.bind(this));
    });
  },

  setup: function () {
    var mockProj = this;
    return rimraf(mockProj.projectRoot).then(function () {
      return mkdir(mockProj.projectRoot).then(function () {
        return RSVP.all([
          this._setupNpm(),
          this._setupBower()
        ]);
      }.bind(this));
    }.bind(this));
  },

  destroy: function () {
    return rimraf(this.projectRoot);
  },

  _jsonFileData: function (filename) {
    return readFile(path.join(this.projectRoot, filename)).then(function(fileData) {
      return JSON.parse(fileData);
    });
  },

  bowerData: function() {
    return this._jsonFileData('bower.json');
  },

  npmData: function() {
    return this._jsonFileData('package.json');
  },

  backupBowerData: function () {
    return this._jsonFileData('bower.json.ember-try');
  },

  backupNpmData: function () {
    return this._jsonFileData('package.json.ember-try');
  },

  createBowerBackup: function (scenario) {
    var mockProj = this;
    return this.bowerData().then(function(data){

      var bowerJson = JSON.parse(JSON.stringify(data));
      var depTypes = ['dependencies', 'devDependencies'];
      depTypes.forEach(function (depType) {
        var vers = scenario[depType] || {};
        for(var k in vers) {
          bowerJson[depType][k] = vers[k];
        }
      });
      return writeFile(mockProj.projectRoot + '/bower.json.ember-try', JSON.stringify(bowerJson, null, 2));
    });
  },

  createNpmBackup: function (scenario) {
    var mockProj = this;
    return this.npmData().then(function(packageJson){
      var depTypes = ['dependencies', 'devDependencies'];
      depTypes.forEach(function(depType) {
        var vers = scenario.npm[depType] || {};
        for(var k in vers) {
          packageJson[depType][k] = vers[k];
        }
      });
      fs.writeFileSync(mockProj.projectRoot + '/package.json.ember-try', JSON.stringify(packageJson, null, 2));
    });
  }
};

module.exports = MockProject;
