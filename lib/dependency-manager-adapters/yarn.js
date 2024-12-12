'use strict';

const { LOCKFILE } = require('../utils/package-managers');
const { BaseAdapter } = require('./base');

module.exports = class YarnAdapter extends BaseAdapter {
  defaultInstallOptions = ['--no-lockfile', '--ignore-engines'];
  lockfile = LOCKFILE.yarn;
  name = 'yarn';
  overridesKey = 'resolutions';
};
