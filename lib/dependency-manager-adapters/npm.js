'use strict';

const CoreObject = require('core-object');
const fs = require('fs-extra');
const RSVP = require('rsvp');
const path = require('path');
const extend = require('extend');
const debug = require('debug')('ember-try:dependency-manager-adapter:npm');
const rimraf = RSVP.denodeify(require('rimraf'));
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
  setup(options) {
    if (!options) {
      options = {};
    }
    this._runYarnCheck(options.ui);
    return this._backupOriginalDependencies();
  },
  changeToDependencySet(depSet) {
    let adapter = this;

    adapter.applyDependencySet(depSet);

    return adapter._install(depSet).then(() => {
      let deps = extend({}, depSet.dependencies || {}, depSet.devDependencies || {});
      let currentDeps = Object.keys(deps).map((dep) => {
        return {
          name: dep,
          versionExpected: deps[dep],
          versionSeen: adapter._findCurrentVersionOf(dep),
          packageManager: adapter.useYarnCommand ? 'yarn' : 'npm',
        };
      });

      debug('Switched to dependencies: \n', currentDeps);

      return RSVP.Promise.resolve(currentDeps);
    });
  },
  cleanup() {
    let adapter = this;

    return this._restoreOriginalDependencies().then(() => {
      debug('Remove backup package.json and node_modules');

      let cleanupTasks = [rimraf(path.join(adapter.cwd, adapter.packageJSONBackupFileName)),
        rimraf(path.join(adapter.cwd, adapter.nodeModulesBackupLocation))];

      if (fs.existsSync(path.join(this.cwd, this.yarnLockBackupFileName))) {
        cleanupTasks.push(rimraf(path.join(adapter.cwd, adapter.yarnLockBackupFileName)));
      }

      if (fs.existsSync(path.join(this.cwd, this.npmShrinkWrapBackupFileName))) {
        cleanupTasks.push(rimraf(path.join(adapter.cwd, adapter.npmShrinkWrapBackupFileName)));
      }

      if (fs.existsSync(path.join(this.cwd, this.packageLockBackupFileName))) {
        cleanupTasks.push(rimraf(path.join(adapter.cwd, adapter.packageLockBackupFileName)));
      }

      return RSVP.all(cleanupTasks);
    }).catch((e) => {
      console.log('Error cleaning up npm scenario:', e); // eslint-disable-line no-console
    });
  },
  _runYarnCheck(ui) {
    if (!this.useYarnCommand) {
      try {
        if (fs.statSync(path.join(this.cwd, this.yarnLock)).isFile()) {
          ui.writeLine(chalk.yellow('Detected a yarn.lock file. Add `useYarn: true` to your `config/ember-try.js` configuration file if you want to use Yarn to install npm dependencies.'));
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
  _install(depSet) {
    let adapter = this;
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

    return this.run(cmd, [].concat(['install'], mgrOptions), { cwd: this.cwd }).then(() => {
      if (!adapter.useYarnCommand) {
        return adapter.run('npm', ['--version'], { cwd: this.cwd, stdio: 'pipe' }).then((res) => {
          let version = res.stdout;
          if (version.match(/^4./)) {
            debug('Running npm prune because version is %s', version);
            return adapter.run(adapter.configKey, ['prune'], { cwd: adapter.cwd });
          }

          debug('Not running npm prune because version is %s', version);
        })
      }
    });
  },
  applyDependencySet(depSet) {

    debug('Changing to dependency set: %s', JSON.stringify(depSet));

    if (!depSet) { return RSVP.resolve([]); }
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
    if (!depSet[kindOfDependency]) { return; }
    let pkgs = Object.keys(depSet[kindOfDependency]);

    pkgs.forEach((pkg) => {
      if (!packageJSON[kindOfDependency]) {
        packageJSON[kindOfDependency] = {};
      }

      let version = depSet[kindOfDependency][pkg];
      if (version === null) {
        delete packageJSON[kindOfDependency][pkg];
      } else {
        packageJSON[kindOfDependency][pkg] = version;
      }
    });
  },
  _restoreOriginalDependencies() {
    let copy = RSVP.denodeify(fs.copy);

    debug('Restoring original package.json and node_modules');

    let restoreTasks = [
      copy(path.join(this.cwd, this.packageJSONBackupFileName),
        path.join(this.cwd, this.packageJSON)),
      copy(path.join(this.cwd, this.nodeModulesBackupLocation),
        path.join(this.cwd, this.nodeModules), { clobber: true }),
    ];

    if (fs.existsSync(path.join(this.cwd, this.yarnLockBackupFileName))) {
      restoreTasks.push(copy(path.join(this.cwd, this.yarnLockBackupFileName),
        path.join(this.cwd, this.yarnLock)));
    }

    if (fs.existsSync(path.join(this.cwd, this.npmShrinkWrapBackupFileName))) {
      restoreTasks.push(copy(path.join(this.cwd, this.npmShrinkWrapBackupFileName),
        path.join(this.cwd, this.npmShrinkWrap)));
    }

    if (fs.existsSync(path.join(this.cwd, this.packageLockBackupFileName))) {
      restoreTasks.push(copy(path.join(this.cwd, this.packageLockBackupFileName),
        path.join(this.cwd, this.packageLock)));
    }

    return RSVP.all(restoreTasks);
  },
  _backupOriginalDependencies() {
    let copy = RSVP.denodeify(fs.copy);

    debug('Backing up package.json and node_modules');

    let backupTasks = [
      copy(path.join(this.cwd, this.packageJSON),
        path.join(this.cwd, this.packageJSONBackupFileName)),
      copy(path.join(this.cwd, this.nodeModules),
        path.join(this.cwd, this.nodeModulesBackupLocation), { clobber: true })];

    if (fs.existsSync(path.join(this.cwd, this.yarnLock))) {
      backupTasks.push(copy(path.join(this.cwd, this.yarnLock),
        path.join(this.cwd, this.yarnLockBackupFileName)));
    }

    if (fs.existsSync(path.join(this.cwd, this.npmShrinkWrap))) {
      backupTasks.push(copy(path.join(this.cwd, this.npmShrinkWrap),
        path.join(this.cwd, this.npmShrinkWrapBackupFileName)));
    }

    if (fs.existsSync(path.join(this.cwd, this.packageLock))) {
      backupTasks.push(copy(path.join(this.cwd, this.packageLock),
        path.join(this.cwd, this.packageLockBackupFileName)));
    }

    return RSVP.all(backupTasks);
  },
});
