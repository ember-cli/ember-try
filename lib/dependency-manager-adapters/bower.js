'use strict';

const CoreObject = require('core-object');
const fs = require('fs-extra');
const util = require('util');
const copy = util.promisify(fs.copy);
const path = require('path');
const debug = require('debug')('ember-try:dependency-manager-adapter:bower');
const rimraf = util.promisify(require('rimraf'));
const resolve = require('resolve');
const findEmberPath = require('../utils/find-ember-path');

module.exports = CoreObject.extend({
  init() {
    this._super.apply(this, arguments);
    this.run = this.run || require('../utils/run');
    this.hasBowerFileInitially = fs.existsSync(path.join(this.cwd, this.bowerJSONFileName));
  },

  bowerJSONFileName: 'bower.json',
  bowerJSONBackupFileName: 'bower.json.ember-try',
  defaultBowerJSON() {
    return {
      name: 'ember-try-placeholder',
      dependencies: {},
    };
  },
  configKey: 'bower',

  async setup() {
    if (this.hasBowerFileInitially) {
      return await this._backupBowerFile();
    }
  },

  _writeBowerFileWithDepSetChanges(depSet) {
    let baseBowerJSON;
    let bowerFile = path.join(this.cwd, this.bowerJSONFileName);

    if (this.hasBowerFileInitially) {
      let backupBowerFile = path.join(this.cwd, this.bowerJSONBackupFileName);
      baseBowerJSON = JSON.parse(fs.readFileSync(backupBowerFile));
    } else {
      baseBowerJSON = this.defaultBowerJSON();
    }

    let newBowerJSON = this._bowerJSONForDependencySet(baseBowerJSON, depSet);

    debug('Write bower.json with: \n', JSON.stringify(newBowerJSON));

    fs.writeFileSync(bowerFile, JSON.stringify(newBowerJSON, null, 2));
  },

  /* Compute whether or not there are bower dependencies to install.
   *
   * @return true iff `depSet` has either dependencies or devDependencies
   */
  _hasDependencies(depSet) {
    if (!depSet) { return false; }

    let dependencies = Object.assign({}, depSet.dependencies, depSet.devDependencies);

    return Object.keys(dependencies).length > 0;
  },

  async changeToDependencySet(depSet) {
    debug('Changing to dependency set: %s', JSON.stringify(depSet));

    if (!this._hasDependencies(depSet)) {
      return [];
    }

    this._writeBowerFileWithDepSetChanges(depSet);

    await this._install();

    let deps = Object.assign({}, depSet.dependencies, depSet.devDependencies);

    let currentDeps = Object.keys(deps).map((dep) => {
      return {
        name: dep,
        versionExpected: deps[dep],
        versionSeen: this._findCurrentVersionOf(dep),
        packageManager: 'bower',
      };
    });

    debug('Switched to dependencies: \n', currentDeps);

    return currentDeps;
  },

  async cleanup() {
    if (this.hasBowerFileInitially) {
      try {
        await this._restoreOriginalBowerFile();

        debug('Remove backup bower.json');
        await rimraf(path.join(this.cwd, this.bowerJSONBackupFileName));
      } catch (e) {
        console.log('Error cleaning up bower scenario:', e); // eslint-disable-line no-console
      }

      return await this._install();
    } else {
      await rimraf(path.join(this.cwd, this.bowerJSONFileName));
      await rimraf(path.join(this.cwd, 'bower_components'));
    }
  },

  _findCurrentVersionOf(packageName) {
    let filename = path.join(this.cwd, 'bower_components', packageName, 'bower.json');
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    } else {
      return null;
    }
  },

  async _install() {
    await rimraf(path.join(this.cwd, 'bower_components'));
    debug('Removed bower_components');

    return this._runBowerInstall();
  },

  async _runBowerInstall() {
    let options = this.managerOptions || [];
    let commandParts = ['install', '--config.interactive=false'];

    const bowerPath = await this._findBowerPath(this.cwd);
    debug('Run bower install using bower at %s', bowerPath);

    return await this.run('node', [].concat([bowerPath], commandParts, options), {cwd: this.cwd});
  },

  _bowerJSONForDependencySet(bowerJSON, depSet) {
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

    pkgs.forEach((pkg) => {
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

  _restoreOriginalBowerFile() {
    debug('Restore original bower.json');

    return copy(
      path.join(this.cwd, this.bowerJSONBackupFileName),
      path.join(this.cwd, this.bowerJSONFileName)
    );
  },

  _backupBowerFile() {
    debug('Backup bower.json');

    return copy(
      path.join(this.cwd, this.bowerJSONFileName),
      path.join(this.cwd, this.bowerJSONBackupFileName)
    );
  },

  async _findBowerPath() {
    const emberPath = await findEmberPath(this.cwd);

    /* Find bower's entry point module relative to ember-cli's entry point script */
    let bowerPath = this._resolveModule('bower', {basedir: path.dirname(emberPath)});

    return `"${path.join(bowerPath, '..', '..', 'bin', 'bower')}"`;
  },

  _resolveModule(moduleName, options) {
    return resolve.sync(moduleName, options);
  },
});
