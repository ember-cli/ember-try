'use strict';

var path = require('path');
var fs = require('fs');
var extend = require('extend');
var RSVP = require('rsvp');
var findByName = require('./find-by-name');
var debug = require('debug')('ember-try:utils:config');

function config(options) {
  var relativePath = options.configPath || path.join('config', 'ember-try.js');
  var configFile = path.join(options.project.root, relativePath);
  var configData;

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

  var versionCompatibility = options.versionCompatibility || versionCompatibilityFromPackageJSON(options.project.root);

  if (versionCompatibility) {
    // Required lazily to improve startup speed.
    var autoScenarioConfigForEmber = require('ember-try-config');
    return autoScenarioConfigForEmber({versionCompatibility: versionCompatibility, project: options.project}).then(function(autoConfig) {
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

  var conf = extend({}, autoConfig, configData);

  var overriddenScenarios = autoConfig.scenarios.map(function(scenario) {
    var overriddenScenario = findByName(configData.scenarios, scenario.name);
    return extend({}, scenario, overriddenScenario);
  });

  var additionalScenarios = configData.scenarios.filter(function(scenario) {
    return !findByName(autoConfig.scenarios, scenario.name);
  });

  conf.scenarios = [].concat(overriddenScenarios, additionalScenarios);
  return conf;
}

function versionCompatibilityFromPackageJSON(root) {
  var packageJSONFile  = path.join(root, 'package.json');
  if (fs.existsSync(packageJSONFile)) {
    var packageJSON = JSON.parse(fs.readFileSync(packageJSONFile));
    return packageJSON['ember-addon'] ? packageJSON['ember-addon'].versionCompatibility : null;
  }
}

function defaultConfig() {
  return {
    scenarios: [
      {
        name: 'default',
        bower: {
          dependencies: { } /* No dependencies needed as the
                               default is already specified in
                               the consuming app's bower.json */
        }
      },
      {
        name: 'ember-release',
        bower: {
          dependencies: {
            ember: 'release'
          }
        }
      },
      {
        name: 'ember-beta',
        bower: {
          dependencies: {
            ember: 'beta'
          }
        }
      },
      {
        name: 'ember-canary',
        bower: {
          dependencies: {
            ember: 'canary'
          }
        }
      }
    ]
  };
}

// Used for internal testing purposes.
module.exports._defaultConfig = defaultConfig;
