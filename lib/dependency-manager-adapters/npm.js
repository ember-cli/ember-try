'use strict';

const CoreObject = require('core-object');
const fs = require('fs-extra');
const util = require('util');
const copy = util.promisify(fs.copy);
const path = require('path');
const debug = require('debug')('ember-try:dependency-manager-adapter:npm');
const rimraf = util.promisify(require('rimraf'));
const chalk = require('chalk');

module.exports = CoreObject.extend({
  init() {
    this._super.apply(this, arguments);
    this.run = this.run || require('../utils/run');
  },
  useYarnCommand: false,
  yarnLock: 'yarn.lock',
  yarnLockBackupFileName: 'yarn.lock.ember-try',
  configKey: 'npm',
  packageJSON: 'package.json',
  packageJSONBackupFileName: 'package.json.ember-try',
  nodeModules: 'node_modules',
  nodeModulesBackupLocation: '.node_modules.ember-try',
  npmShrinkWrap: 'npm-shrinkwrap.json',
  npmShrinkWrapBackupFileName: 'npm-shrinkwrap.json.ember-try',
  packageLock: 'package-lock.json',
  packageLockBackupFileName: 'package-lock.json.ember-try',

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

      debug('Remove backup package.json and node_modules');

      let cleanupTasks = [
        rimraf(path.join(this.cwd, this.packageJSONBackupFileName)),
        rimraf(path.join(this.cwd, this.nodeModulesBackupLocation)),
      ];

      if (fs.existsSync(path.join(this.cwd, this.yarnLockBackupFileName))) {
        cleanupTasks.push(rimraf(path.join(this.cwd, this.yarnLockBackupFileName)));
      }

      if (fs.existsSync(path.join(this.cwd, this.npmShrinkWrapBackupFileName))) {
        cleanupTasks.push(rimraf(path.join(this.cwd, this.npmShrinkWrapBackupFileName)));
      }

      if (fs.existsSync(path.join(this.cwd, this.packageLockBackupFileName))) {
        cleanupTasks.push(rimraf(path.join(this.cwd, this.packageLockBackupFileName)));
      }

      return await Promise.all(cleanupTasks);
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
    let filename = path.join(this.cwd, this.nodeModules, packageName, this.packageJSON);
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
      } else if (mgrOptions.indexOf('--no-shrinkwrap') === -1) {
        mgrOptions = mgrOptions.concat(['--no-shrinkwrap']);
      }
    }

    debug('Run npm/yarn install with options %s', mgrOptions);

    await this.run(cmd, [].concat(['install'], mgrOptions), { cwd: this.cwd });

    if (!this.useYarnCommand) {
      let res = await this.run('npm', ['--version'], { cwd: this.cwd, stdio: 'pipe' });
      let version = res.stdout;
      if (version.match(/^4./)) {
        debug('Running npm prune because version is %s', version);
        return await this.run(this.configKey, ['prune'], { cwd: this.cwd });
      }

      debug('Not running npm prune because version is %s', version);
    }
  },

  applyDependencySet(depSet) {
    debug('Changing to dependency set: %s', JSON.stringify(depSet));

    if (!depSet) {
      return;
    }

    let backupPackageJSON = path.join(this.cwd, this.packageJSONBackupFileName);
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
      }
    });
  },

  _restoreOriginalDependencies() {
    debug('Restoring original package.json and node_modules');

    let restoreTasks = [
      copy(
        path.join(this.cwd, this.packageJSONBackupFileName),
        path.join(this.cwd, this.packageJSON)
      ),
    ];

    let nodeModulesBackupLocation = path.join(this.cwd, this.nodeModulesBackupLocation);
    if (fs.existsSync(nodeModulesBackupLocation)) {
      restoreTasks.push(
        copy(nodeModulesBackupLocation, path.join(this.cwd, this.nodeModules), { clobber: true })
      );
    }

    let yarnLockBackupFileName = path.join(this.cwd, this.yarnLockBackupFileName);
    if (fs.existsSync(yarnLockBackupFileName)) {
      restoreTasks.push(copy(yarnLockBackupFileName, path.join(this.cwd, this.yarnLock)));
    }

    let npmShrinkWrapBackupFileName = path.join(this.cwd, this.npmShrinkWrapBackupFileName);
    if (fs.existsSync(npmShrinkWrapBackupFileName)) {
      restoreTasks.push(copy(npmShrinkWrapBackupFileName, path.join(this.cwd, this.npmShrinkWrap)));
    }

    let packageLockBackupFileName = path.join(this.cwd, this.packageLockBackupFileName);
    if (fs.existsSync(packageLockBackupFileName)) {
      restoreTasks.push(copy(packageLockBackupFileName, path.join(this.cwd, this.packageLock)));
    }

    return Promise.all(restoreTasks);
  },

  _backupOriginalDependencies() {
    debug('Backing up package.json and node_modules');

    let backupTasks = [
      copy(
        path.join(this.cwd, this.packageJSON),
        path.join(this.cwd, this.packageJSONBackupFileName)
      ),
    ];

    let nodeModulesPath = path.join(this.cwd, this.nodeModules);
    if (fs.existsSync(nodeModulesPath)) {
      backupTasks.push(
        copy(nodeModulesPath, path.join(this.cwd, this.nodeModulesBackupLocation), {
          clobber: true,
        })
      );
    }

    let yarnLockPath = path.join(this.cwd, this.yarnLock);
    if (fs.existsSync(yarnLockPath)) {
      backupTasks.push(copy(yarnLockPath, path.join(this.cwd, this.yarnLockBackupFileName)));
    }

    let npmShrinkWrapPath = path.join(this.cwd, this.npmShrinkWrap);
    if (fs.existsSync(npmShrinkWrapPath)) {
      backupTasks.push(
        copy(npmShrinkWrapPath, path.join(this.cwd, this.npmShrinkWrapBackupFileName))
      );
    }

    let packageLockPath = path.join(this.cwd, this.packageLock);
    if (fs.existsSync(packageLockPath)) {
      backupTasks.push(copy(packageLockPath, path.join(this.cwd, this.packageLockBackupFileName)));
    }

    return Promise.all(backupTasks);
  },
});
