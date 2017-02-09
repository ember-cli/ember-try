'use strict';

var Base          = require('./base');
var RSVP          = require('rsvp');
var path          = require('path');
var debug         = require('debug');
var rimraf        = RSVP.denodeify(require('rimraf'));
var resolve       = RSVP.denodeify(require('resolve'));
var findEmberPath = require('../utils/find-ember-path');

module.exports = Base.extend({
  debug: debug('ember-try:dependency-manager-adapter:bower'),
  messages: {
    cleanupMessage: 'Remove backup bower.json',
    cleanupErrorMessage: 'Error cleaning up bower scenario:',
    restoreMessage: 'Restore original bower.json',
    backupMessage: 'Backup bower.json',
    writeDepSetMessage: 'Write bower.json with: \n'
  },
  restoreLocations: [
    {
      location: 'bower.json',
      backup: 'bower.json.ember-try',
      clobber: undefined
    }
  ],

  depFile: 'bower.json',
  backupDepFile: 'bower.json.ember-try',
  packageManager: 'bower',

  configKey: 'bower',

  _getDepSet: function(depSet) {
    if (depSet[this.configKey]) {
      return depSet[this.configKey];
    }
    return {dependencies: depSet.dependencies, devDependencies: depSet.devDependencies, resolutions: depSet.resolutions};
  },

  _install: function() {
    var adapter = this;
    var options = this.managerOptions || [];

    return rimraf(path.join(adapter.cwd, 'bower_components'))
      .then(function() {
        adapter.debug('Remove bower_components');
        return adapter._findBowerPath(adapter.cwd);
      })
      .then(function(bowerPath) {
        adapter.debug('Run bower install using bower at %s', bowerPath);
        return adapter.run('node', [].concat([bowerPath, 'install', '--config.interactive=false'], options), {cwd: adapter.cwd});
      });
  },
  _newJSONForDependencySet: function(bowerJSON, depSet) {
    if (!bowerJSON.resolutions) {
      bowerJSON.resolutions = {};
    }

    this._overrideBowerJSONDependencies(bowerJSON, depSet, 'dependencies');
    this._overrideBowerJSONDependencies(bowerJSON, depSet, 'devDependencies');

    return bowerJSON;
  },
  _overrideBowerJSONDependencies: function(bowerJSON, depSet, kindOfDependency) {
    if (!depSet[kindOfDependency]) { return; }
    var pkgs = Object.keys(depSet[kindOfDependency]);

    pkgs.forEach(function(pkg) {
      if (!bowerJSON[kindOfDependency]) {
        bowerJSON[kindOfDependency] = {};
      }

      var version = depSet[kindOfDependency][pkg];
      if (version === null) {
        delete bowerJSON[kindOfDependency][pkg];
        delete bowerJSON.resolutions[pkg];
      } else {
        bowerJSON[kindOfDependency][pkg] = version;

        if (depSet.resolutions && depSet.resolutions[pkg]) {
          bowerJSON.resolutions[pkg] = depSet.resolutions[pkg];
        } else {
          bowerJSON.resolutions[pkg] = version;
        }
      }
    });
  },
  _findBowerPath: function() {
    var adapter = this;
    return findEmberPath(adapter.cwd)
      .then(function(emberPath) {
        /* Find bower's entry point module relative to
         ember-cli's entry point script */
        return adapter._resolveModule('bower', { basedir: path.dirname(emberPath) })
          .catch(function() {
            adapter.debug('Bower not found');
            return adapter._installBower();
          }).then(function() {
            return adapter._resolveModule('bower', { basedir: path.dirname(emberPath) });
          });
      })
      .then(function(bowerPath) {
        return path.join(bowerPath, '..', '..', 'bin', 'bower');
      });
  },
  _installBower: function() {
    var adapter = this;
    adapter.debug('Installing bower via npm');
    return adapter.run('npm', [].concat(['install', 'bower@^1.3.12']), { cwd: adapter.cwd });
  },
  _resolveModule: function(moduleName, options) {
    return resolve(moduleName, options);
  }
});
