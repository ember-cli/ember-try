'use strict';

var CoreObject    = require('core-object');
var fs            = require('fs-extra');
var RSVP          = require('rsvp');
var path          = require('path');
var extend        = require('extend');
var debug         = require('debug')('ember-try:dependency-manager-adapter:npm');
var rimraf        = RSVP.denodeify(require('rimraf'));

module.exports = CoreObject.extend({
  init: function() {
    this._super.apply(this, arguments);
    this.run = this.run || require('../utils/run');
  },
  configKey: 'npm',
  packageJSON: 'package.json',
  packageJSONBackupFileName: 'package.json.ember-try',
  nodeModules: 'node_modules',
  nodeModulesBackupLocation: '.node_modules.ember-try',
  setup: function() {
    return this._backupOriginalDependencies();
  },
  changeToDependencySet: function(depSet) {
    var adapter = this;
    depSet = depSet[adapter.configKey];

    debug('Changing to dependency set: %s', JSON.stringify(depSet));

    if (!depSet) { return RSVP.resolve([]); }
    var backupPackageJSON = path.join(adapter.cwd, adapter.packageJSONBackupFileName);
    var packageJSONFile = path.join(adapter.cwd, adapter.packageJSON);
    var packageJSON = JSON.parse(fs.readFileSync(backupPackageJSON));
    var newPackageJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

    debug('Write package.json with: \n', JSON.stringify(newPackageJSON));

    fs.writeFileSync(packageJSONFile, JSON.stringify(newPackageJSON, null, 2));
    return adapter._install().then(function() {
      var deps = extend({}, depSet.dependencies || {}, depSet.devDependencies || {});
      var currentDeps = Object.keys(deps).map(function(dep) {
        return {
          name: dep,
          versionExpected: deps[dep],
          versionSeen: adapter._findCurrentVersionOf(dep),
          packageManager: 'npm'
        };
      });

      debug('Switched to dependencies: \n', currentDeps);

      return RSVP.Promise.resolve(currentDeps);
    });
  },
  cleanup: function() {
    var adapter = this;
    return adapter._restoreOriginalDependencies().then(function() {
      debug('Remove backup package.json and node_modules');
      return RSVP.all([rimraf(path.join(adapter.cwd, adapter.packageJSONBackupFileName)),
      rimraf(path.join(adapter.cwd, adapter.nodeModulesBackupLocation))]);
    }).catch(function(e) {
      console.log('Error cleaning up npm scenario:', e);
    })
    .then(function() {
      return adapter._install();
    });
  },
  _findCurrentVersionOf: function(packageName) {
    var filename = path.join(this.cwd, this.nodeModules, packageName, this.packageJSON);
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    } else {
      return null;
    }
  },
  _install: function() {
    var adapter = this;
    var options = this.managerOptions || [];

    debug('Run npm install with options %s', options);

    return adapter.run('npm', [].concat(['install'], options), {cwd: adapter.cwd}).then(function() {
      debug('Run npm prune');
      return adapter.run('npm', [].concat(['prune'], options), {cwd: adapter.cwd});
    });
  },
  _packageJSONForDependencySet: function(packageJSON, depSet) {

    this._overridePackageJSONDependencies(packageJSON, depSet, 'dependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'devDependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'peerDependencies');

    return packageJSON;
  },
  _overridePackageJSONDependencies: function(packageJSON, depSet, kindOfDependency) {
    if (!depSet[kindOfDependency]) { return; }
    var pkgs = Object.keys(depSet[kindOfDependency]);

    pkgs.forEach(function(pkg) {
      if (!packageJSON[kindOfDependency]) {
        packageJSON[kindOfDependency] = {};
      }

      var version = depSet[kindOfDependency][pkg];
      if (version === null) {
        delete packageJSON[kindOfDependency][pkg];
      } else {
        packageJSON[kindOfDependency][pkg] = version;
      }
    });
  },
  _restoreOriginalDependencies: function() {
    var copy = RSVP.denodeify(fs.copy);

    debug('Restoring original package.json and node_modules');

    return RSVP.all([
      copy(path.join(this.cwd, this.packageJSONBackupFileName),
           path.join(this.cwd, this.packageJSON)),
      copy(path.join(this.cwd, this.nodeModulesBackupLocation),
           path.join(this.cwd, this.nodeModules), {clobber: true})]);
  },
  _backupOriginalDependencies: function() {
    var copy = RSVP.denodeify(fs.copy);

    debug('Backing up package.json and node_modules');

    return RSVP.all([
      copy(path.join(this.cwd, this.packageJSON),
           path.join(this.cwd, this.packageJSONBackupFileName)),
      copy(path.join(this.cwd, this.nodeModules),
           path.join(this.cwd, this.nodeModulesBackupLocation), {clobber: true})]);
  }
});
