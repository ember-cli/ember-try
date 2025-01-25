'use strict';

const path = require('path');
const fs = require('fs');
const { prefix, warn } = require('./console');
const debug = require('debug')('ember-try:utils:config');

function getConfigPath(cwd) {
  let packageFile = readPackageFile(cwd);
  let possibleConfigPath;

  if (packageFile['ember-addon']?.['configPath']) {
    possibleConfigPath = path.join(packageFile['ember-addon']['configPath'], 'ember-try.js');
  }

  if (fs.existsSync(possibleConfigPath)) {
    debug(`using config from package.json ember-addon.configPath: ${possibleConfigPath}`);

    return possibleConfigPath;
  }

  debug('using config from config/ember-try.js');

  return path.join('config', 'ember-try.js');
}

async function getBaseConfig(options) {
  let relativeConfigPath = options.configPath || getConfigPath(options.cwd);
  let configPath = path.join(options.cwd, relativeConfigPath);
  let data;

  if (fs.existsSync(configPath)) {
    let configData = await require(configPath);

    data = typeof configData === 'function' ? await configData() : configData;
  } else {
    debug('Config file does not exist %s', configPath);
  }

  if (data && data.scenarios && !data.useVersionCompatibility && !options.versionCompatibility) {
    return data;
  }

  let versionCompatibility =
    options.versionCompatibility || versionCompatibilityFromPackageJSON(options.cwd);
  if (versionCompatibility) {
    // Required lazily to improve startup speed.
    let autoScenarioConfigForEmber = require('ember-try-config');

    let autoConfig = await autoScenarioConfigForEmber({
      versionCompatibility,
    });
    return await mergeAutoConfigAndConfigFileData(autoConfig, data);
  } else {
    throw new Error(
      'No ember-try configuration found. Please see the README for configuration options',
    );
  }
}

async function config(options) {
  const configData = await getBaseConfig(options);

  for (const packageManager of [
    ['pnpm', 'usePnpm'],
    ['yarn', 'useYarn'],
  ]) {
    const [name, oldOption] = packageManager;

    if (typeof configData[oldOption] === 'boolean') {
      warn(
        `${prefix('ember-try DEPRECATION')} The \`${oldOption}\` config option is deprecated. Please use \`packageManager: '${name}'\` instead.`,
      );

      delete configData[oldOption];
      configData.packageManager = name;
    }
  }

  return configData;
}

module.exports = config;

function mergeAutoConfigAndConfigFileData(autoConfig, configData) {
  configData = configData || {};
  configData.scenarios = configData.scenarios || [];

  let conf = Object.assign({}, autoConfig, configData);

  let overriddenScenarios = autoConfig.scenarios.map((scenario) => {
    let overriddenScenario = configData.scenarios.find((s) => s.name === scenario.name);
    return Object.assign({}, scenario, overriddenScenario);
  });

  let additionalScenarios = configData.scenarios.filter((scenario) => {
    return !autoConfig.scenarios.find((s) => s.name === scenario.name);
  });

  conf.scenarios = [...overriddenScenarios, ...additionalScenarios];

  return conf;
}

function versionCompatibilityFromPackageJSON(cwd) {
  let packageFile = readPackageFile(cwd);

  return packageFile['ember-addon']?.versionCompatibility ?? null;
}

function readPackageFile(cwd) {
  let packageFile = path.join(cwd, 'package.json');

  if (fs.existsSync(packageFile)) {
    return JSON.parse(fs.readFileSync(packageFile));
  } else {
    return {};
  }
}
