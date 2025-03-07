'use strict';

const debug = require('debug');
const { get, set } = require('es-toolkit/compat');
const fs = require('fs-extra');
const path = require('node:path');
const semver = require('semver');
const Backup = require('../utils/backup');
const { warn } = require('../utils/console');
const { LOCKFILE, PACKAGE_JSON } = require('../utils/package-managers');

function merge(a, b) {
  const copy = {...a};

  for (const k in b) {
    // for merging arrays, provide your own function
    if (Array.isArray(k)) {
      copy[k] = b[k];
    }

    else if (typeof b[k] === 'object') {
      copy[k] = merge(a[k] ?? {}, b[k]);
    }

    else {
      copy[k] = b[k];
    }
  }

  return copy;
}

class BaseAdapter {
  configKey = 'npm';
  defaultInstallOptions = [];
  lockfile = '';
  name = '';
  overridesKey = '';

  backup = null;
  debugFunction = null;

  constructor(options) {
    this.backup = new Backup({ cwd: options.cwd });
    this.buildManagerOptions = options.buildManagerOptions;
    this.cwd = options.cwd;
    this.managerOptions = options.managerOptions;
    this.run = options.run ?? require('../utils/run');
  }

  debug(...args) {
    if (this.debugFunction === null) {
      this.debugFunction = debug(`ember-try:dependency-manager-adapter:${this.name}`);
    }

    this.debugFunction(...args);
  }

  async setup() {
    this._checkForDifferentLockfiles();

    await this.backup.addFiles([PACKAGE_JSON, this.lockfile]);
  }

  async changePackage(packageJson) {
    // packageJson can be a function
    // this.debug('Change package with: %s', JSON.stringify(packageJson));

    const oldPackageJSON = JSON.parse(fs.readFileSync(this.backup.pathForFile(PACKAGE_JSON)));
    const newPackageJSON = this._applyPackageChanges(oldPackageJSON, packageJson);

    this.debug('Write package.json with: \n', JSON.stringify(newPackageJSON));

    fs.writeFileSync(path.join(this.cwd, PACKAGE_JSON), JSON.stringify(newPackageJSON, null, 2));

    // find the delta of deps
    // put in the delta here
    await this._install({});

    // ... and here
    return this._findChangedDependencies(newPackageJSON);
  }

  _applyPackageChanges(originalPackage, packageChanges) {
    if (typeof packageChanges === 'function') {
      return packageChanges(originalPackage);
    }

    return merge(originalPackage, packageChanges);
  }

  async _findChangedDependencies(packageJson) {
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const currentDependencies = Object.keys(dependencies).map((name) => ({
      name,
      packageManager: this.name,
      versionExpected: dependencies[name],
      versionSeen: this._findCurrentVersionOf(name),
    }));

    this.debug('Switched to dependencies: \n', currentDependencies);
  }

  async changeToDependencySet(dependencySet) {
    await this.applyDependencySet(dependencySet);
    await this._install(dependencySet);

    return this._findChangedDependencies(dependencySet);
  }

  async applyDependencySet(dependencySet) {
    if (dependencySet === undefined) {
      return;
    }

    this.debug('Changing to dependency set: %s', JSON.stringify(dependencySet));

    const oldPackageJSON = JSON.parse(fs.readFileSync(this.backup.pathForFile(PACKAGE_JSON)));
    const newPackageJSON = this._packageJSONForDependencySet(oldPackageJSON, dependencySet);

    this.debug('Write package.json with: \n', JSON.stringify(newPackageJSON));

    fs.writeFileSync(path.join(this.cwd, PACKAGE_JSON), JSON.stringify(newPackageJSON, null, 2));
  }

  async cleanup() {
    try {
      await this.backup.restoreFiles([PACKAGE_JSON, this.lockfile]);
      await this.backup.cleanUp();
      await this._install();
    } catch (error) {
      console.error('Error cleaning up scenario:', error);
    }
  }

  _checkForDifferentLockfiles() {
    for (const packageManager in LOCKFILE) {
      const lockfile = LOCKFILE[packageManager];

      if (lockfile === this.lockfile) {
        continue;
      }

      try {
        if (fs.statSync(path.join(this.cwd, lockfile)).isFile()) {
          warn(
            `Detected a \`${lockfile}\` file. Add \`packageManager: '${packageManager}'\` to your \`config/ember-try.js\` configuration file if you want to use ${packageManager} to install dependencies.`,
          );
        }
      } catch {
        // Move along.
      }
    }
  }

  _findCurrentVersionOf(name) {
    const filename = path.join(this.cwd, 'node_modules', name, PACKAGE_JSON);

    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    } else {
      return null;
    }
  }

  async _install(dependencySet) {
    let managerOptions = this.managerOptions || [];

    if (typeof this.buildManagerOptions === 'function') {
      managerOptions = this.buildManagerOptions(dependencySet);

      if (Array.isArray(managerOptions) === false) {
        throw new Error('buildManagerOptions must return an array of options');
      }
    } else if (this.defaultInstallOptions.length) {
      for (const option of this.defaultInstallOptions) {
        if (managerOptions.includes(option) === false) {
          managerOptions.push(option);
        }
      }
    }

    this.debug(`Running ${this.name} install with options %s`, managerOptions);

    await this.run(this.name, ['install', ...managerOptions], { cwd: this.cwd });
  }

  _packageJSONForDependencySet(packageJSON, dependencySet) {
    this._overridePackageJSONDependencies(packageJSON, dependencySet, 'dependencies');
    this._overridePackageJSONDependencies(packageJSON, dependencySet, 'devDependencies');
    this._overridePackageJSONDependencies(packageJSON, dependencySet, 'peerDependencies');
    this._overridePackageJSONDependencies(packageJSON, dependencySet, 'ember');
    this._overridePackageJSONDependencies(packageJSON, dependencySet, this.overridesKey);

    return packageJSON;
  }

  _overridePackageJSONDependencies(packageJSON, dependencySet, kindOfDependency) {
    if (get(dependencySet, kindOfDependency) === undefined) {
      return;
    }

    let packageNames = Object.keys(get(dependencySet, kindOfDependency));

    for (let packageName of packageNames) {
      let version = get(dependencySet, `${kindOfDependency}.${packageName}`);

      if (version === null) {
        delete get(packageJSON, kindOfDependency)[packageName];
      } else {
        set(packageJSON, `${kindOfDependency}.${packageName}`, version);

        if (semver.prerelease(version) || /^https*:\/\/.*\.tg*z/.test(version)) {
          set(packageJSON, `${this.overridesKey}.${packageName}`, `$${packageName}`);
        }
      }
    }
  }
}

module.exports = { BaseAdapter };
