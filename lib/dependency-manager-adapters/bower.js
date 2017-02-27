'use strict';

const Base = require('./base');
const fs = require('fs-extra');
const RSVP = require('rsvp');
const path = require('path');
const debug = require('debug');
const rimraf = RSVP.denodeify(require('rimraf'));
const resolve = RSVP.denodeify(require('resolve'));
const findEmberPath = require('../utils/find-ember-path');

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
  defaultDepFile: {
    name: 'ember-try-placeholder',
    dependencies: {}
  },
  backupDepFile: 'bower.json.ember-try',
  packageManager: 'bower',
  packagesFolder: 'bower_components',

  init() {
    this._super.apply(this, arguments);
    this.hasBowerFileInitially = fs.existsSync(path.join(this.cwd, this.depFile));
  },

  setup() {
    return this.hasBowerFileInitially ? this._backup() : RSVP.resolve();
  },

  cleanup() {
    if (this.hasBowerFileInitially) {
      return this._super.apply(this, arguments);
    } else {
      return rimraf(path.join(this.cwd, this.depFile))
        .then(() => rimraf(path.join(this.cwd, 'bower_components')));
    }
  },

  _getDepSet(depSet) {
    if (depSet[this.packageManager]) {
      return depSet[this.packageManager];
    }
    return { dependencies: depSet.dependencies, devDependencies: depSet.devDependencies, resolutions: depSet.resolutions };
  },

  writeDepFile(depSet) {
    let baseBowerJSON;
    let bowerFile = path.join(this.cwd, this.depFile);

    if (this.hasBowerFileInitially) {
      let backupBowerFile = path.join(this.cwd, this.depFile);
      baseBowerJSON = JSON.parse(fs.readFileSync(backupBowerFile));
    } else {
      baseBowerJSON = this.defaultDepFile;
    }

    let newBowerJSON = this._newJSONForDependencySet(baseBowerJSON, depSet);

    this.debug(this.messages.writeDepSetMessage, JSON.stringify(newBowerJSON));

    fs.writeFileSync(bowerFile, JSON.stringify(newBowerJSON, null, 2));
  },

  _install: function() {
    let options = this.managerOptions || [];

    return rimraf(path.join(this.cwd, 'bower_components'))
      .then(() => {
        this.debug('Remove bower_components');
        return this._findBowerPath(this.cwd);
      })
      .then((bowerPath) => {
        this.debug('Run bower install using bower at %s', bowerPath);
        return this.run('node', [].concat([bowerPath, 'install', '--config.interactive=false'], options), { cwd: this.cwd });
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
  _overrideBowerJSONDependencies(bowerJSON, depSet, kindOfDependency) {
    if (!depSet[kindOfDependency]) { return; }
    let pkgs = Object.keys(depSet[kindOfDependency]);

    pkgs.forEach(function(pkg) {
      if (!bowerJSON[kindOfDependency]) {
        bowerJSON[kindOfDependency] = {};
      }

      let version = depSet[kindOfDependency][pkg];
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
  _findBowerPath() {
    return findEmberPath(this.cwd)
      .then((emberPath) => {
        /* Find bower's entry point module relative to
         ember-cli's entry point script */
        return this._resolveModule('bower', { basedir: path.dirname(emberPath) })
          .catch(() => {
            this.debug('Bower not found');
            return this._installBower();
          }).then(() => {
            return this._resolveModule('bower', { basedir: path.dirname(emberPath) });
          });
      })
      .then((bowerPath) => {
        return path.join(bowerPath, '..', '..', 'bin', 'bower');
      });
  },
  _installBower() {
    this.debug('Installing bower via npm');
    return this.run('npm', [].concat(['install', 'bower@^1.3.12']), { cwd: this.cwd });
  },
  _resolveModule(moduleName, options) {
    return resolve(moduleName, options);
  }
});
