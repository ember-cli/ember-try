'use strict';

const CoreObject = require('core-object');
const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('ember-try:dependency-manager-adapter:pnpm');
const Backup = require('../utils/backup');

const PACKAGE_JSON = 'package.json';
const PNPM_LOCKFILE = 'pnpm-lock.yaml';

module.exports = CoreObject.extend({
  // This still needs to be `npm` because we're still reading the dependencies
  // from the `npm` key of the ember-try config.
  configKey: 'npm',

  init() {
    this._super.apply(this, arguments);
    this.backup = new Backup({ cwd: this.cwd });
    this.run = this.run || require('../utils/run');
  },

  async setup() {
    await this.backup.addFiles([PACKAGE_JSON, PNPM_LOCKFILE]);
  },

  async changeToDependencySet(depSet) {
    await this.applyDependencySet(depSet);

    await this._install(depSet);

    let deps = Object.assign({}, depSet.dependencies, depSet.devDependencies);
    let currentDeps = Object.keys(deps).map((dep) => {
      return {
        name: dep,
        versionExpected: deps[dep],
        versionSeen: this._findCurrentVersionOf(dep),
        packageManager: 'pnpm',
      };
    });

    debug('Switched to dependencies: \n', currentDeps);

    return currentDeps;
  },

  async cleanup() {
    try {
      await this.backup.restoreFiles([PACKAGE_JSON, PNPM_LOCKFILE]);
      await this.backup.cleanUp();
      await this._install();
    } catch (e) {
      console.log('Error cleaning up scenario:', e); // eslint-disable-line no-console
    }
  },

  _findCurrentVersionOf(packageName) {
    let filename = path.join(this.cwd, 'node_modules', packageName, PACKAGE_JSON);
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    } else {
      return null;
    }
  },

  async _install(depSet) {
    let mgrOptions = this.managerOptions || [];

    // buildManagerOptions overrides all default
    if (typeof this.buildManagerOptions === 'function') {
      mgrOptions = this.buildManagerOptions(depSet);

      if (!Array.isArray(mgrOptions)) {
        throw new Error('buildManagerOptions must return an array of options');
      }
    } else {
      if (!mgrOptions.includes('--no-lockfile')) {
        mgrOptions.push('--no-lockfile');
      }
    }

    // Note: We are explicitly *not* using `--no-lockfile` here, so that we
    // only have to resolve the dependencies that have actually changed.

    debug('Run pnpm install with options %s', mgrOptions);

    await this.run('pnpm', [].concat(['install'], mgrOptions), { cwd: this.cwd });
  },

  async applyDependencySet(depSet) {
    debug('Changing to dependency set: %s', JSON.stringify(depSet));

    if (!depSet) {
      return;
    }

    let backupPackageJSON = this.backup.pathForFile(PACKAGE_JSON);
    let packageJSONFile = path.join(this.cwd, PACKAGE_JSON);
    let packageJSON = JSON.parse(fs.readFileSync(backupPackageJSON));
    let newPackageJSON = this._packageJSONForDependencySet(packageJSON, depSet);

    debug('Write package.json with: \n', JSON.stringify(newPackageJSON));
    fs.writeFileSync(packageJSONFile, JSON.stringify(newPackageJSON, null, 2));

    // We restore the original lockfile here, so that we always create a minimal
    // diff compared to the original locked dependency set.

    await this.backup.restoreFile(PNPM_LOCKFILE);
  },

  _packageJSONForDependencySet(packageJSON, depSet) {
    this._overridePackageJSONDependencies(packageJSON, depSet, 'dependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'devDependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'peerDependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'ember');

    // see https://pnpm.io/package_json#pnpmoverrides
    this._overridePackageJSONDependencies(packageJSON, depSet, 'overrides');

    return packageJSON;
  },

  _overridePackageJSONDependencies(packageJSON, depSet, kindOfDependency) {
    if (!depSet[kindOfDependency]) {
      return;
    }

    let packageNames = Object.keys(depSet[kindOfDependency]);

    for (let packageName of packageNames) {
      if (!packageJSON[kindOfDependency]) {
        packageJSON[kindOfDependency] = {};
      }

      let version = depSet[kindOfDependency][packageName];
      if (version === null) {
        delete packageJSON[kindOfDependency][packageName];
      } else {
        packageJSON[kindOfDependency][packageName] = version;
      }
    }
  },
});
