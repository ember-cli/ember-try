'use strict';

const path = require('path');
const fs = require('fs');
const findByName = require('./find-by-name');
const debug = require('debug')('ember-try:utils:config');

const IMPLICIT_BOWER_VERSION = '^1.8.2';

function getConfigPath(project) {
  let possibleConfigPath;
  if (project.pkg && project.pkg['ember-addon'] && project.pkg['ember-addon']['configPath']) {
    let configDir = project.pkg['ember-addon']['configPath'];

    possibleConfigPath = path.join(configDir, 'ember-try.js');
  }

  if (fs.existsSync(possibleConfigPath)) {
    debug(`using config from package.json ember-addon.configPath: ${possibleConfigPath}`);

    return possibleConfigPath;
  }

  debug('using config from config/ember-try.js');

  return path.join('config', 'ember-try.js');
}

async function getBaseConfig(options) {
  let relativeConfigPath = options.configPath || getConfigPath(options.project);
  let configPath = path.join(options.project.root, relativeConfigPath);
  let data;

  if (fs.existsSync(configPath)) {
    let configData = await require(configPath);

    data = typeof configData === 'function' ? await configData(options.project) : configData;
  } else {
    debug('Config file does not exist %s', configPath);
  }

  if (data && data.scenarios && !data.useVersionCompatibility && !options.versionCompatibility) {
    return data;
  }

  let versionCompatibility = options.versionCompatibility || versionCompatibilityFromPackageJSON(options.project.root);
  if (versionCompatibility) {
    // Required lazily to improve startup speed.
    let autoScenarioConfigForEmber = require('ember-try-config');

    let autoConfig = await autoScenarioConfigForEmber({versionCompatibility, project: options.project});
    return await mergeAutoConfigAndConfigFileData(autoConfig, data);
  } else {
    throw new Error('No ember-try configuration found. Please see the README for configuration options');
  }
}

async function config(options) {
  const configData = await getBaseConfig(options);

  return addImplicitBowerToScenarios(configData);
}

module.exports = config;

function addImplicitBowerToScenarios(configData) {
  configData.scenarios.forEach((scenario) => {
    if (!('bower' in scenario)) {
      // Don't do anything for scenarios that don't include bower
      return;
    }

    if ('npm' in scenario) {
      let npm = scenario.npm;
      if ((npm.dependencies && npm.dependencies.bower) ||
          (npm.devDependencies && npm.devDependencies.bower)) {
        // Dont' do anything for scenarios that already include bower in npm,
        // either as a dependency or a dev dependency
        return;
      }
    }

    // add an implicit bower dev dependency to npm for this scenario
    scenario.npm = scenario.npm || {};
    scenario.npm.devDependencies = scenario.npm.devDependencies || {};
    scenario.npm.devDependencies.bower = IMPLICIT_BOWER_VERSION;
  });

  return configData;
}

function mergeAutoConfigAndConfigFileData(autoConfig, configData) {
  configData = configData || {};
  configData.scenarios = configData.scenarios || [];

  let conf = Object.assign({}, autoConfig, configData);

  let overriddenScenarios = autoConfig.scenarios.map((scenario) => {
    let overriddenScenario = findByName(configData.scenarios, scenario.name);
    return Object.assign({}, scenario, overriddenScenario);
  });

  let additionalScenarios = configData.scenarios.filter((scenario) => {
    return !findByName(autoConfig.scenarios, scenario.name);
  });

  conf.scenarios = [
    ...overriddenScenarios,
    ...additionalScenarios
  ];

  return conf;
}

function versionCompatibilityFromPackageJSON(root) {
  let packageJSONFile = path.join(root, 'package.json');
  if (fs.existsSync(packageJSONFile)) {
    let packageJSON = JSON.parse(fs.readFileSync(packageJSONFile));

    return packageJSON['ember-addon'] ? packageJSON['ember-addon'].versionCompatibility : null;
  }
}

// Used for internal testing purposes.
module.exports._addImplicitBowerToScenarios = addImplicitBowerToScenarios;
