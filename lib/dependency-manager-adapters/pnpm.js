'use strict';

const CoreObject = require('core-object');
const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('ember-try:dependency-manager-adapter:pnpm');

const PACKAGE_JSON = 'package.json';
const PACKAGE_JSON_BACKUP = 'package.json.ember-try';
const PNPM_LOCKFILE = 'pnpm-lock.yaml';

// Note: the upstream convention is to append `.ember-try` _after_ the file
// extension, however this breaks syntax highlighting, so I've chosen to
// insert it right before the file extension.
const PNPM_LOCKFILE_BACKUP = 'pnpm-lock.ember-try.yaml';

module.exports = CoreObject.extend({
  // This still needs to be `npm` because we're still reading the dependencies
  // from the `npm` key of the ember-try config.
  configKey: 'npm',

  init() {
    this._super.apply(this, arguments);
    this.run = this.run || require('../utils/run');
  },

  async setup() {
    let pkg = path.join(this.cwd, PACKAGE_JSON);
    let pkgBackup = path.join(this.cwd, PACKAGE_JSON_BACKUP);
    debug(`Copying ${PACKAGE_JSON}`);
    await fs.copy(pkg, pkgBackup);

    let lockFile = path.join(this.cwd, PNPM_LOCKFILE);
    let lockFileBackup = path.join(this.cwd, PNPM_LOCKFILE_BACKUP);
    if (fs.existsSync(lockFile)) {
      debug(`Copying ${PNPM_LOCKFILE}`);
      await fs.copy(lockFile, lockFileBackup);
    }
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
      debug(`Restoring original ${PACKAGE_JSON}`);
      let pkg = path.join(this.cwd, PACKAGE_JSON);
      let pkgBackup = path.join(this.cwd, PACKAGE_JSON_BACKUP);
      await fs.copy(pkgBackup, pkg);
      await fs.remove(pkgBackup);

      debug(`Restoring original ${PNPM_LOCKFILE}`);
      let lockFile = path.join(this.cwd, PNPM_LOCKFILE);
      let lockFileBackup = path.join(this.cwd, PNPM_LOCKFILE_BACKUP);
      await fs.copy(lockFileBackup, lockFile);
      await fs.remove(lockFileBackup);

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
    } else if (!mgrOptions.includes('--frozen-lockfile=false')) {
      mgrOptions.push('--frozen-lockfile=false');
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

    let backupPackageJSON = path.join(this.cwd, PACKAGE_JSON_BACKUP);
    let packageJSONFile = path.join(this.cwd, PACKAGE_JSON);
    let packageJSON = JSON.parse(fs.readFileSync(backupPackageJSON));
    let newPackageJSON = this._packageJSONForDependencySet(packageJSON, depSet);

    debug('Write package.json with: \n', JSON.stringify(newPackageJSON));
    fs.writeFileSync(packageJSONFile, JSON.stringify(newPackageJSON, null, 2));

    // We restore the original lockfile here, so that we always create a minimal
    // diff compared to the original locked dependency set.

    let lockFile = path.join(this.cwd, PNPM_LOCKFILE);
    let lockFileBackup = path.join(this.cwd, PNPM_LOCKFILE_BACKUP);
    if (fs.existsSync(lockFileBackup)) {
      debug(`Restoring original ${PNPM_LOCKFILE}`);
      await fs.copy(lockFileBackup, lockFile);
    }
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
