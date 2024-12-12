'use strict';

const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('ember-try:dependency-manager-adapter:yarn');
const Backup = require('../utils/backup');

module.exports = class {
  configKey = 'npm'; // Still use `npm` for now!
  packageJSON = 'package.json';
  yarnLock = 'yarn.lock';

  constructor(options) {
    this.buildManagerOptions = options.buildManagerOptions;
    this.cwd = options.cwd;
    this.managerOptions = options.managerOptions;
    this.run = options.run || require('../utils/run');

    this.backup = new Backup({ cwd: this.cwd });
  }

  async setup(options) {
    if (!options) {
      options = {};
    }

    return await this._backupOriginalDependencies();
  }

  async changeToDependencySet(depSet) {
    this.applyDependencySet(depSet);

    await this._install(depSet);

    let deps = Object.assign({}, depSet.dependencies, depSet.devDependencies);
    let currentDeps = Object.keys(deps).map((dep) => {
      return {
        name: dep,
        versionExpected: deps[dep],
        versionSeen: this._findCurrentVersionOf(dep),
        packageManager: 'yarn',
      };
    });

    debug('Switched to dependencies: \n', currentDeps);

    return currentDeps;
  }

  async cleanup() {
    try {
      await this._restoreOriginalDependencies();
    } catch (e) {
      console.log('Error cleaning up npm scenario:', e); // eslint-disable-line no-console
    }
  }

  _findCurrentVersionOf(packageName) {
    let filename = path.join(this.cwd, 'node_modules', packageName, this.packageJSON);
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    } else {
      return null;
    }
  }

  async _install(depSet) {
    let mgrOptions = this.managerOptions || [];

    // buildManagerOptions overrides all default
    if (typeof this.buildManagerOptions === 'function') {
      mgrOptions = this.buildManagerOptions(depSet);

      if (!Array.isArray(mgrOptions)) {
        throw new Error('buildManagerOptions must return an array of options');
      }
    } else {
      if (mgrOptions.indexOf('--no-lockfile') === -1) {
        mgrOptions = mgrOptions.concat(['--no-lockfile']);
      }

      // yarn errors on incompatible engines, not a good experience
      if (mgrOptions.indexOf('--ignore-engines') === -1) {
        mgrOptions = mgrOptions.concat(['--ignore-engines']);
      }
    }

    debug('Run yarn install with options %s', mgrOptions);

    await this.run('yarn', [].concat(['install'], mgrOptions), { cwd: this.cwd });
  }

  applyDependencySet(depSet) {
    debug('Changing to dependency set: %s', JSON.stringify(depSet));

    if (!depSet) {
      return;
    }

    let backupPackageJSON = this.backup.pathForFile(this.packageJSON);
    let packageJSONFile = path.join(this.cwd, this.packageJSON);
    let packageJSON = JSON.parse(fs.readFileSync(backupPackageJSON));
    let newPackageJSON = this._packageJSONForDependencySet(packageJSON, depSet);

    debug('Write package.json with: \n', JSON.stringify(newPackageJSON));

    fs.writeFileSync(packageJSONFile, JSON.stringify(newPackageJSON, null, 2));
  }

  _packageJSONForDependencySet(packageJSON, depSet) {
    this._overridePackageJSONDependencies(packageJSON, depSet, 'dependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'devDependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'peerDependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'ember');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'resolutions');

    return packageJSON;
  }

  _overridePackageJSONDependencies(packageJSON, depSet, kindOfDependency) {
    if (!depSet[kindOfDependency]) {
      return;
    }

    let packageNames = Object.keys(depSet[kindOfDependency]);

    packageNames.forEach((packageName) => {
      if (!packageJSON[kindOfDependency]) {
        packageJSON[kindOfDependency] = {};
      }

      let version = depSet[kindOfDependency][packageName];
      if (version === null) {
        delete packageJSON[kindOfDependency][packageName];
      } else {
        packageJSON[kindOfDependency][packageName] = version;
      }
    });
  }

  async _restoreOriginalDependencies() {
    await this.backup.restoreFiles([this.packageJSON, this.yarnLock]);
    await this.backup.cleanUp();
    await this._install();
  }

  async _backupOriginalDependencies() {
    await this.backup.addFiles([this.packageJSON, this.yarnLock]);
  }
};
