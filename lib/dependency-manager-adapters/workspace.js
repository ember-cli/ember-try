'use strict';

const CoreObject = require('core-object');
const fs = require('fs-extra');
const path = require('path');
const debug = require('debug')('ember-try:dependency-manager-adapter:workspaces');
const walkSync = require('walk-sync');

const NpmAdapter = require('./npm');

module.exports = CoreObject.extend({
  init() {
    this._super.apply(this, arguments);
    this.run = this.run || require('../utils/run');

    if (!this.useYarnCommand) {
      throw new Error(
        'workspaces are currently only supported by Yarn, you must set `useYarn` to true'
      );
    }
    let packageJSON = JSON.parse(fs.readFileSync(this.packageJSON));
    let workspaceGlobs;

    if (Array.isArray(packageJSON.workspaces)) {
      workspaceGlobs = packageJSON.workspaces;
    }

    if (packageJSON.workspaces && Array.isArray(packageJSON.workspaces.packages)) {
      workspaceGlobs = packageJSON.workspaces.packages;
    }

    if (!workspaceGlobs || !workspaceGlobs.length) {
      throw new Error(
        'you must define the `workspaces` property in package.json with at least one workspace to use workspaces with ember-try'
      );
    }

    // workspaces is a list of globs, loop over the list and find
    // all paths that contain a `package.json` file
    let workspacePaths = walkSync('.', { globs: workspaceGlobs }).filter((workspacePath) => {
      let packageJSONPath = path.join(this.cwd, workspacePath, 'package.json');
      return fs.existsSync(packageJSONPath);
    });

    this._packageAdapters = workspacePaths.map((workspacePath) => {
      return new NpmAdapter({
        cwd: workspacePath,
        run: this.run,
        managerOptions: this.managerOptions,
        useYarnCommand: true,
        buildManagerOptions: this.buildManagerOptions,
      });
    });
  },

  packageJSON: 'package.json',

  setup(options) {
    if (!options) {
      options = {};
    }

    return Promise.all(this._packageAdapters.map((adapter) => adapter.setup(options)));
  },

  async changeToDependencySet(depSet) {
    // TODO: What should this do for tables? Nesting? Needs different output
    this._packageAdapters.forEach((adapter) => {
      adapter.applyDependencySet(depSet);
    });

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
  },

  cleanup() {
    return Promise.all(this._packageAdapters.map((adapter) => adapter.cleanup()));
  },

  _install(depSet) {
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
      // npm warns on incompatible engines
      // yarn errors, not a good experience
      if (mgrOptions.indexOf('--ignore-engines') === -1) {
        mgrOptions = mgrOptions.concat(['--ignore-engines']);
      }
    }

    debug('Run yarn install with options %s', mgrOptions);

    return this.run('yarn', ['install', ...mgrOptions], { cwd: this.cwd });
  },

  _findCurrentVersionOf(dep) {
    return this._packageAdapters[0]._findCurrentVersionOf(dep);
  },
});
