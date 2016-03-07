'use strict';
var semver = require('semver');

var EmberVersions = ['v2.5.0-beta.1', 'v2.4.0', 'v2.4.0-beta.3', 'v2.3.1', 'v2.4.0-beta.2', 'v2.4.0-beta.1', 'v2.3.0', 'v2.3.0-beta.3', 'v2.3.0-beta.2', 'v2.3.0-beta.1', 'v2.2.0', 'v2.1.1', 'v1.13.11', 'v2.2.0-beta.2', 'v2.2.0-beta.1', 'v2.1.0', 'v2.1.0-beta.4', 'v1.13.10', 'v2.0.2', 'v2.1.0-beta.3', 'v2.1.0-beta.2', 'v2.0.1', 'v1.13.9', 'v2.1.0-beta.1', 'v2.0.0', 'v1.13.8', 'v2.0.0-beta.5', 'v1.13.7', 'v2.0.0-beta.4', 'v1.13.6', 'v2.0.0-beta.3', 'v1.13.5', 'v1.13.4', 'v2.0.0-beta.2', 'v1.13.3', 'v1.13.2', 'v1.13.1', 'v1.13.0', 'v1.12.1', 'v1.13.0-beta.1', 'v1.12.0', 'v1.11.1', 'v1.12.0-beta.1', 'v1.11.0', 'v1.11.0-beta.5', 'v1.11.0-beta.4', 'v1.11.0-beta.3', 'v1.11.0-beta.2', 'v1.11.0-beta.1', 'v1.10.0', 'v1.10.0-beta.4', 'v1.10.0-beta.3', 'v1.10.0-beta.1', 'v1.9.1', 'v1.10.0-beta.2', 'v1.9.0', 'v1.9.0-beta.4', 'v1.9.0-beta.3', 'v1.9.0-beta.1', 'v1.8.1', 'v1.8.0', 'v1.7.1', 'v1.8.0-beta.5', 'v1.8.0-beta.4', 'v1.8.0-beta.3', 'v1.8.0-beta.2'];

module.exports = function generateConfig(packages, availableVersions) {
  return { scenarios:  [].concat(baseScenarios(), generateScenariosFromSemver(packages, availableVersions))};
};

function generateScenariosFromSemver(packages, availableVersions) {
  var statement = packages.ember;
  availableVersions = availableVersions || EmberVersions;
  var versions = availableVersions.filter(function(versionNumber) {
    return semver.satisfies(versionNumber, statement);
  });

  return versions.map(function(version) {
    var versionNum = semver.clean(version);
    return {
      name: 'ember-' + versionNum,
      bower: {
        dependencies: {
          ember: versionNum
        }
      }
    };
  });
}

function baseScenarios() {
  return [
    {
      name: 'default',
      bower: {
        dependencies: {}
      }
    },
    {
      name: 'ember-beta',
      allowedToFail: true,
      bower: {
        dependencies: {
          ember: 'components/ember#beta'
        },
        resolutions: {
          ember: 'beta'
        }
      }
    },
    {
      name: 'ember-canary',
      allowedToFail: true,
      bower: {
        dependencies: {
          ember: 'components/ember#canary'
        },
        resolutions: {
          ember: 'canary'
        }
      }
    }
  ];
}
