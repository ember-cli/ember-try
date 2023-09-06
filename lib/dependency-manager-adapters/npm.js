'use strict';

const CoreObject = require('core-object');
const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('ember-try:dependency-manager-adapter:npm');
const chalk = require('chalk');
const semver = require('semver');
const Backup = require('../utils/backup');

module.exports = CoreObject.extend({
  init() {
    this._super.apply(this, arguments);
    this.backup = new Backup({ cwd: this.cwd });
    this.run = this.run || require('../utils/run');
  },
  useYarnCommand: false,
  yarnLock: 'yarn.lock',
  configKey: 'npm',
  packageJSON: 'package.json',
  packageLock: 'package-lock.json',

  async setup(options) {
    if (!options) {
      options = {};
    }

    this._runYarnCheck(options.ui);

    return await this._backupOriginalDependencies();
  },

  async changeToDependencySet(depSet) {
    this.applyDependencySet(depSet);

    await this._install(depSet);

    let deps = Object.assign({}, depSet.dependencies, depSet.devDependencies);
    let currentDeps = Object.keys(deps).map((dep) => {
      return {
        name: dep,
        versionExpected: deps[dep],
        versionSeen: this._findCurrentVersionOf(dep),
        packageManager: this.useYarnCommand ? 'yarn' : 'npm',
      };
    });

    debug('Switched to dependencies: \n', currentDeps);

    return currentDeps;
  },

  async cleanup() {
    try {
      await this._restoreOriginalDependencies();
    } catch (e) {
      console.log('Error cleaning up npm scenario:', e); // eslint-disable-line no-console
    }
  },

  _runYarnCheck(ui) {
    if (!this.useYarnCommand) {
      try {
        if (fs.statSync(path.join(this.cwd, this.yarnLock)).isFile()) {
          ui.writeLine(
            chalk.yellow(
              'Detected a yarn.lock file. Add `useYarn: true` to your `config/ember-try.js` configuration file if you want to use Yarn to install npm dependencies.'
            )
          );
        }
      } catch (e) {
        // If no yarn.lock is found, no need to warn.
      }
    }
  },

  _findCurrentVersionOf(packageName) {
    let filename = path.join(this.cwd, 'node_modules', packageName, this.packageJSON);
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    } else {
      return null;
    }
  },

  async _install(depSet) {
    let mgrOptions = this.managerOptions || [];
    let cmd = this.useYarnCommand ? 'yarn' : 'npm';

    // buildManagerOptions overrides all default
    if (typeof this.buildManagerOptions === 'function') {
      mgrOptions = this.buildManagerOptions(depSet);

      if (!Array.isArray(mgrOptions)) {
        throw new Error('buildManagerOptions must return an array of options');
      }
    } else {
      if (this.useYarnCommand) {
        if (mgrOptions.indexOf('--no-lockfile') === -1) {
          mgrOptions = mgrOptions.concat(['--no-lockfile']);
        }
        // npm warns on incompatible engines
        // yarn errors, not a good experience
        if (mgrOptions.indexOf('--ignore-engines') === -1) {
          mgrOptions = mgrOptions.concat(['--ignore-engines']);
        }
      } else if (mgrOptions.indexOf('--no-package-lock') === -1) {
        mgrOptions = mgrOptions.concat(['--no-package-lock']);
      }
    }

    debug('Run npm/yarn install with options %s', mgrOptions);

    await this.run(cmd, [].concat(['install'], mgrOptions), { cwd: this.cwd });
  },

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
  },

  _packageJSONForDependencySet(packageJSON, depSet) {
    this._overridePackageJSONDependencies(packageJSON, depSet, 'dependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'devDependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'peerDependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'ember');

    if (this.useYarnCommand) {
      this._overridePackageJSONDependencies(packageJSON, depSet, 'resolutions');
    } else {
      this._overridePackageJSONDependencies(packageJSON, depSet, 'overrides');
    }

    return packageJSON;
  },

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

        // in npm we need to always add an override if the version is a pre-release
        if (
          !this.useYarnCommand &&
          (semver.prerelease(version) || /^https*:\/\/.*\.tg*z/.test(version))
        ) {
          if (!packageJSON.overrides) {
            packageJSON.overrides = {};
          }

          packageJSON.overrides[packageName] = `$${packageName}`;
        }
      }
    });
  },

  async _restoreOriginalDependencies() {
    await this.backup.restoreFiles([this.packageJSON, this.packageLock, this.yarnLock]);
    await this.backup.cleanUp();
    await this._install();
  },

  async _backupOriginalDependencies() {
    await this.backup.addFiles([this.packageJSON, this.packageLock, this.yarnLock]);
  },
});
