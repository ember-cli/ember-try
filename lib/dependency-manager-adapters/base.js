'use strict';

const CoreObject = require('core-object');
const fs = require('fs-extra');
const RSVP = require('rsvp');
const path = require('path');
const rimraf = RSVP.denodeify(require('rimraf'));
const extend = require('extend');

module.exports = CoreObject.extend({
  debug() {},

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

  _findCurrentVersionOf(packageName) {
    let filename = path.join(this.cwd, this.packagesFolder, packageName, this.depFile);
    return fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename)).version : null;
  },

  _restore() {
    this.debug(this.messages.restoreMessage);
    return RSVP.all(this._copyDependencies(false));
  },

  _copyDependencies(forward) {
    let copy = RSVP.denodeify(fs.copy);
    return this.restoreLocations.map((loc) => {
      let to, from;
      if (forward) {
        from = loc.location;
        to = loc.backup;
      } else {
        from = loc.backup;
        to = loc.location;
      }
      return copy(path.join(this.cwd, from),
        path.join(this.cwd, to), { clobber: loc.clobber });
    });
  },

  _backup: function() {
    this.debug(this.messages.backupMessage);
    return RSVP.all(this._copyDependencies(true));
  },

  _removeBackup() {
    return this.restoreLocations.map((location) => rimraf(path.join(this.cwd, location.backup)));
  },

  init() {
    this._super.apply(this, arguments);
    this.run = this.run || require('../utils/run');
  },

  setup() {
    return this._backup();
  },

  cleanup() {
    return this._restore().then(() => {
      this.debug(this.messages.cleanupMessage);
      return RSVP.all(this._removeBackup())
        .catch((e) => {
          console.log(this.messages.cleanupErrorMessage, e);
        })
        .then(() => this._install()
        );
    });
  },

  _getDepSet(depSet) {
    return depSet[this.packageManager];
  },

  _newJSONForDependencySet() {
    return {};
  },

  _install() {},

  writeDepFile(depSet) {
    let backupDepFile = path.join(this.cwd, this.backupDepFile);
    let depFile = path.join(this.cwd, this.depFile);
    let backupDepSet = JSON.parse(fs.readFileSync(backupDepFile));
    let newDepSet = this._newJSONForDependencySet(backupDepSet, depSet);
    this.debug(this.messages.writeDepSetMessage, JSON.stringify(newDepSet));
    fs.writeFileSync(depFile, JSON.stringify(newDepSet, null, 2));
  },

  changeToDependencySet: function(depSet) {
    depSet = this._getDepSet(depSet);
    this.debug('Changing to dependency set: %s', JSON.stringify(depSet));
    if (!depSet) { return RSVP.resolve([]); }

    this.writeDepFile(depSet);

    return this._install().then(() => {
      let deps = extend({}, depSet.dependencies || {}, depSet.devDependencies || {});
      let currentDeps = Object.keys(deps).map((dep) => {
        return {
          name: dep,
          versionExpected: deps[dep],
          versionSeen: this._findCurrentVersionOf(dep),
          packageManager: this.packageManager
        };
      });

      this.debug('Switched to dependencies: \n', currentDeps);

      return RSVP.Promise.resolve(currentDeps);
    });
  }
});
