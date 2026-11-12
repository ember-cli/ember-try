'use strict';

const fs = require('fs-extra');
const path = require('node:path');
const semver = require('semver');
const YAML = require('yaml');
const { LOCKFILE } = require('../utils/package-managers');
const { BaseAdapter } = require('./base');

const WORKSPACE_YAML = 'pnpm-workspace.yaml';

module.exports = class PnpmAdapter extends BaseAdapter {
  defaultInstallOptions = ['--no-lockfile', '--ignore-scripts'];
  lockfile = LOCKFILE.pnpm;
  name = 'pnpm';
  overridesKey = 'pnpm.overrides';

  pnpmVersion = null;
  workspaceOverrides = null;

  async setup() {
    await this._throwOnResolutionMode();
    await super.setup();
    await this.backup.addFile(WORKSPACE_YAML);
  }

  async applyDependencySet(dependencySet) {
    await super.applyDependencySet(dependencySet);

    if (this.workspaceOverrides !== null) {
      this._writeWorkspaceOverrides(this.workspaceOverrides);
    }
  }

  async cleanup() {
    if (this.workspaceOverrides !== null) {
      if (fs.existsSync(this.backup.pathForFile(WORKSPACE_YAML))) {
        await this.backup.restoreFile(WORKSPACE_YAML);
      } else {
        await fs.remove(path.join(this.cwd, WORKSPACE_YAML));
      }
    }

    await super.cleanup();
  }

  _packageJSONForDependencySet(packageJSON, dependencySet) {
    if (!this._readsWorkspaceSettings()) {
      return super._packageJSONForDependencySet(packageJSON, dependencySet);
    }

    // pnpm 11 and later ignore the `pnpm` field in package.json
    const originalPnpmField = packageJSON.pnpm;

    packageJSON.pnpm = { overrides: { ...this._readWorkspaceOverrides() } };

    const result = super._packageJSONForDependencySet(packageJSON, dependencySet);

    this.workspaceOverrides = result.pnpm.overrides;

    if (originalPnpmField === undefined) {
      delete result.pnpm;
    } else {
      result.pnpm = originalPnpmField;
    }

    return result;
  }

  _readsWorkspaceSettings() {
    return this.pnpmVersion !== null && semver.satisfies(this.pnpmVersion, '>=11.0.0');
  }

  _readWorkspaceDocument() {
    const backupFile = this.backup.pathForFile(WORKSPACE_YAML);

    if (fs.existsSync(backupFile)) {
      return YAML.parseDocument(fs.readFileSync(backupFile, 'utf-8'));
    }

    return new YAML.Document({});
  }

  _readWorkspaceOverrides() {
    return this._readWorkspaceDocument().toJS()?.overrides ?? {};
  }

  _writeWorkspaceOverrides(overrides) {
    const hasOverrides = Object.keys(overrides).length > 0;

    if (!hasOverrides && !fs.existsSync(this.backup.pathForFile(WORKSPACE_YAML))) {
      return;
    }

    const document = this._readWorkspaceDocument();

    if (!hasOverrides) {
      document.delete('overrides');
    } else {
      document.set('overrides', overrides);
    }

    fs.writeFileSync(path.join(this.cwd, WORKSPACE_YAML), document.toString());
  }

  /**
   * pnpm versions 8.0.0 through 8.6.* have the `resolution-mode` setting inverted to
   * `lowest-direct`, which breaks ember-try. This method throws a helpful error in the following
   * case: pnpm version is within dangerous range and `pnpm config get resolution-mode` reports an
   * empty value.
   *
   * @returns Promise<void>
   */
  async _throwOnResolutionMode() {
    this.pnpmVersion = await this._getPnpmVersion();
    let resolutionMode = await this._getResolutionMode();

    if (this._isResolutionModeWrong(this.pnpmVersion, resolutionMode)) {
      throw new Error(
        'You are using an old version of pnpm that uses wrong resolution mode that violates ember-try expectations. Please either upgrade pnpm or set `resolution-mode` to `highest` in `.npmrc`.',
      );
    }
  }

  async _getPnpmVersion() {
    let result = await this.run('pnpm', ['--version'], { cwd: this.cwd, stdio: 'pipe' });
    return result.stdout.split('\n')[0];
  }

  async _getResolutionMode() {
    let result = await this.run('pnpm', ['config', 'get', 'resolution-mode'], {
      cwd: this.cwd,
      stdio: 'pipe',
    });

    return result.stdout.split('\n')[0];
  }

  _isResolutionModeWrong(versionStr, resolutionMode) {
    // The `resolution-mode` is not set explicitly, and the current pnpm version makes it default
    // to `lowest-direct`
    if (
      !resolutionMode.length &&
      semver.gte(versionStr, '8.0.0') &&
      semver.lt(versionStr, '8.7.0')
    ) {
      return true;
    }

    return false;
  }
};
