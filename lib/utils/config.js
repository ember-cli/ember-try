'use strict';

var path = require('path');
var fs = require('fs');
var extend = require('extend');
var RSVP = require('rsvp');
var findByName = require('./find-by-name');
var debug = require('debug')('ember-try:utils:config');

var IMPLICIT_BOWER_VERSION = '^1.8.2';

function getBaseConfig(options) {
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

  return RSVP.resolve(configData).then(function(data) {
    if (data && data.scenarios && !data.useVersionCompatibility && !options.versionCompatibility) {
      return RSVP.resolve(data);
    }

    var versionCompatibility = options.versionCompatibility || versionCompatibilityFromPackageJSON(options.project.root);

    if (versionCompatibility) {
      // Required lazily to improve startup speed.
      var autoScenarioConfigForEmber = require('ember-try-config');
      return autoScenarioConfigForEmber({ versionCompatibility: versionCompatibility, project: options.project }).then(function(autoConfig) {
        return mergeAutoConfigAndConfigFileData(autoConfig, data);
      });
    } else {
      return defaultConfig();
    }
  });
}

function config(options) {
  return getBaseConfig(options).then(function(configData) {
    return addImplicitBowerToScenarios(configData);
  });
}

module.exports = config;

function addImplicitBowerToScenarios(configData) {
  configData.scenarios.forEach(function(scenario) {
    if (!('bower' in scenario)) {
      // Don't do anything for scenarios that don't include bower
      return;
    }

    if ('npm' in scenario) {
      var npm = scenario.npm;
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
  var packageJSONFile = path.join(root, 'package.json');
  if (fs.existsSync(packageJSONFile)) {
    var packageJSON = JSON.parse(fs.readFileSync(packageJSONFile));
    return packageJSON['ember-addon'] ? packageJSON['ember-addon'].versionCompatibility : null;
  }
}

function defaultConfig() {
  var getChannelURL = require('ember-source-channel-url');

  return RSVP
    .hash({
      release: getChannelURL('release'),
      beta: getChannelURL('beta'),
      canary: getChannelURL('canary'),
    })
    .then(function(urls) {
      return {
        scenarios: [
          {
            name: 'default',
            npm: { },
          },
          {
            name: 'ember-release',
            npm: {
              devDependencies: {
                'ember-source': urls.release,
              }
            },
          },
          {
            name: 'ember-beta',
            npm: {
              devDependencies: {
                'ember-source': urls.beta,
              }
            },
          },
          {
            name: 'ember-canary',
            npm: {
              devDependencies: {
                'ember-source': urls.canary,
              }
            },
          }
        ]
      };
    });
}

// Used for internal testing purposes.
module.exports._defaultConfig = defaultConfig;
module.exports._addImplicitBowerToScenarios = addImplicitBowerToScenarios;
