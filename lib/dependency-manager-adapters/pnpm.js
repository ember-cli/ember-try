'use strict';

const semver = require('semver');
const { LOCKFILE } = require('../utils/package-managers');
const { BaseAdapter } = require('./base');

module.exports = class PnpmAdapter extends BaseAdapter {
  defaultInstallOptions = ['--no-lockfile', '--ignore-scripts'];
  lockfile = LOCKFILE.pnpm;
  name = 'pnpm';
  overridesKey = 'pnpm.overrides';

  async setup() {
    await this._throwOnResolutionMode();
    await super.setup();
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
    let version = await this._getPnpmVersion();
    let resolutionMode = await this._getResolutionMode();

    if (this._isResolutionModeWrong(version, resolutionMode)) {
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
