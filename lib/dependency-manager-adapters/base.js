'use strict';

var CoreObject    = require('core-object');
var fs            = require('fs-extra');
var RSVP          = require('rsvp');
var path          = require('path');
var rimraf        = RSVP.denodeify(require('rimraf'));
var extend        = require('extend');

module.exports = CoreObject.extend({
  debug: function() {},
  messages: {
    cleanupMessage: '',
    cleanupErrorMessage: '',
    restoreMessage: '',
    backupMessage: '',
    writeDepSetMessage: ''
  },
  depFile: '',
  backupDepFile: '',
  packageManager: '',
  restoreLocations: [],
  packagesFolder: '',

  _findCurrentVersionOf: function(packageName) {
    var filename = path.join(this.cwd, this.packagesFolder, packageName, this.depFile);
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    } else {
      return null;
    }
  },

  _restore: function() {
    this.debug(this.messages.restoreMessage);
    return RSVP.all(this._copyDependencies(false));
  },
  _copyDependencies: function(forward) {
    var copy = RSVP.denodeify(fs.copy);
    var adapter = this;
    return this.restoreLocations.map(function(loc) {
      var to, from;
      if (forward) {
        from = loc.location;
        to = loc.backup;
      } else {
        from = loc.backup;
        to = loc.location;
      }
      return copy(path.join(adapter.cwd, from),
        path.join(adapter.cwd, to), {clobber: loc.clobber});
    });
  },
  _backup: function() {
    this.debug(this.messages.backupMessage);
    return RSVP.all(this._copyDependencies(true));
  },
  _removeBackup: function() {
    var adapter = this;
    return this.restoreLocations.map(function(location) {
      return rimraf(path.join(adapter.cwd, location.backup));
    });
  },
  init: function() {
    this._super.apply(this, arguments);
    this.run = this.run || require('../utils/run');
  },
  setup: function() {
    return this._backup();
  },
  cleanup: function() {
    var adapter = this;
    return adapter._restore().then(function() {
      adapter.debug(adapter.messages.cleanupMessage);
      return RSVP.all(adapter._removeBackup()).catch(function(e) {
        console.log(adapter.messages.cleanupErrorMessage, e);
      }).then(function() {
        return adapter._install();
      })
    });
  },
  _getDepSet: function(depSet) {
    return depSet[this.configKey];
  },
  _newJSONForDependencySet: function() {
    return {};
  },
  _install: function() {},
  changeToDependencySet: function(depSet) {
    var adapter = this;
    depSet = adapter._getDepSet(depSet);
    adapter.debug('Changing to dependency set: %s', JSON.stringify(depSet));
    if (!depSet) { return RSVP.resolve([]); }
    var backupDepFile = path.join(adapter.cwd, adapter.backupDepFile);
    var depFile = path.join(adapter.cwd, adapter.depFile);
    var backupDepSet = JSON.parse(fs.readFileSync(backupDepFile));
    var newDepSet = adapter._newJSONForDependencySet(backupDepSet, depSet);
    adapter.debug(this.messages.writeDepSetMessage, JSON.stringify(newDepSet));
    fs.writeFileSync(depFile, JSON.stringify(newDepSet, null, 2));
    return adapter._install().then(function() {
      var deps = extend({}, depSet.dependencies || {}, depSet.devDependencies || {});
      var currentDeps = Object.keys(deps).map(function(dep) {
        return {
          name: dep,
          versionExpected: deps[dep],
          versionSeen: adapter._findCurrentVersionOf(dep),
          packageManager: adapter.packageManager
        };
      });

      adapter.debug('Switched to dependencies: \n', currentDeps);

      return RSVP.Promise.resolve(currentDeps);
    });
  }
});