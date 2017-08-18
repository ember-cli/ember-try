'use strict';

let path = require('path');
let fs = require('fs');
let extend = require('extend');
let RSVP = require('rsvp');
let findByName = require('./find-by-name');
let debug = require('debug')('ember-try:utils:config');

function config(options) {
  let relativePath = options.configPath || path.join('config', 'ember-try.js');
  let configFile = path.join(options.project.root, relativePath);
  let configData;

  if (fs.existsSync(configFile)) {
    configData = require(configFile);

    if (typeof configData === 'function') {
      configData = configData(options.project);
    }
  } else {
    debug('Config file does not exist %s', configFile);
  }

  if (configData && configData.scenarios && !configData.useVersionCompatibility && !options.versionCompatibility) {
    return RSVP.resolve(configData);
  }

  let versionCompatibility = options.versionCompatibility || versionCompatibilityFromPackageJSON(options.project.root);

  if (versionCompatibility) {
    // Required lazily to improve startup speed.
    let autoScenarioConfigForEmber = require('ember-try-config');
    return autoScenarioConfigForEmber({ versionCompatibility, project: options.project }).then((autoConfig) => {
      return mergeAutoConfigAndConfigFileData(autoConfig, configData);
    });
  } else {
    return RSVP.resolve(defaultConfig());
  }
}

module.exports = config;

function mergeAutoConfigAndConfigFileData(autoConfig, configData) {
  configData = configData || {};
  configData.scenarios = configData.scenarios || [];

  let conf = extend({}, autoConfig, configData);

  let overriddenScenarios = autoConfig.scenarios.map((scenario) => {
    let overriddenScenario = findByName(configData.scenarios, scenario.name);
    return extend({}, scenario, overriddenScenario);
  });

  let additionalScenarios = configData.scenarios.filter((scenario) => {
    return !findByName(autoConfig.scenarios, scenario.name);
  });

  conf.scenarios = [].concat(overriddenScenarios, additionalScenarios);
  return conf;
}

function versionCompatibilityFromPackageJSON(root) {
  let packageJSONFile = path.join(root, 'package.json');
  if (fs.existsSync(packageJSONFile)) {
    let packageJSON = JSON.parse(fs.readFileSync(packageJSONFile));
    return packageJSON['ember-addon'] ? packageJSON['ember-addon'].versionCompatibility : null;
  }
}

function defaultConfig() {
  return {
    scenarios: [
      {
        name: 'default',
        bower: {
          dependencies: { }, /* No dependencies needed as the
                               default is already specified in
                               the consuming app's bower.json */
        },
      },
      {
        name: 'ember-release',
        bower: {
          dependencies: {
            ember: 'release',
          },
        },
      },
      {
        name: 'ember-beta',
        bower: {
          dependencies: {
            ember: 'beta',
          },
        },
      },
      {
        name: 'ember-canary',
        bower: {
          dependencies: {
            ember: 'canary',
          },
        },
      },
    ],
  };
}

// Used for internal testing purposes.
module.exports._defaultConfig = defaultConfig;
