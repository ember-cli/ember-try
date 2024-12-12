'use strict';

const { LOCKFILE } = require('../utils/package-managers');
const { BaseAdapter } = require('./base');

module.exports = class NpmAdapter extends BaseAdapter {
  defaultInstallOptions = ['--no-package-lock'];
  lockfile = LOCKFILE.npm;
  name = 'npm';
  overridesKey = 'overrides';
};
