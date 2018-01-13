'use strict';

let path = require('path');
let fs = require('fs');
let extend = require('extend');
let RSVP = require('rsvp');
let findByName = require('./find-by-name');
let debug = require('debug')('ember-try:utils:config');

let IMPLICIT_BOWER_VERSION = '^1.8.2';

function getBaseConfig(options) {
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

  return RSVP.resolve(configData).then((data) => {
    if (data && data.scenarios && !data.useVersionCompatibility && !options.versionCompatibility) {
      return RSVP.resolve(data);
    }

    let versionCompatibility = options.versionCompatibility || versionCompatibilityFromPackageJSON(options.project.root);

    if (versionCompatibility) {
      // Required lazily to improve startup speed.
      let autoScenarioConfigForEmber = require('ember-try-config');
      return autoScenarioConfigForEmber({ versionCompatibility, project: options.project }).then((autoConfig) => {
        return mergeAutoConfigAndConfigFileData(autoConfig, data);
      });
    } else {
      return RSVP.resolve(defaultConfig());
    }
  });
}

function config(options) {
  return getBaseConfig(options).then((configData) => {
    return addImplicitBowerToScenarios(configData);
  });
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
        npm: {
          devDependencies: {
            bower: IMPLICIT_BOWER_VERSION,
          },
        },
      },
      {
        name: 'ember-release',
        bower: {
          dependencies: {
            ember: 'release',
          },
        },
        npm: {
          devDependencies: {
            bower: IMPLICIT_BOWER_VERSION,
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
        npm: {
          devDependencies: {
            bower: IMPLICIT_BOWER_VERSION,
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
        npm: {
          devDependencies: {
            bower: IMPLICIT_BOWER_VERSION,
          },
        },
      },
    ],
  };
}

// Used for internal testing purposes.
module.exports._defaultConfig = defaultConfig;
module.exports._addImplicitBowerToScenarios = addImplicitBowerToScenarios;
