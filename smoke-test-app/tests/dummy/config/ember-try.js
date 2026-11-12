'use strict';

const getChannelURL = require('ember-source-channel-url');
const { embroiderSafe, embroiderOptimized } = require('@embroider/test-setup');

// Ember 7 no longer publishes AMD bundles, so classic builds need current
// build tooling: https://deprecations.emberjs.com/id/using-amd-bundles
const modernBuildTooling = {
  dependencies: {
    'ember-cli-babel': '^8.3.2',
    'ember-cli-htmlbars': '^7.0.1',
  },
  devDependencies: {
    'ember-cli': '^7.3.0',
    // v2 addon; the v1 2.x release does not compile with ember-cli-babel 8
    'ember-load-initializers': '^3.0.1',
  },
  // overrides force the nested copies inside other v1 addons too
  overrides: {
    'ember-cli-babel': '$ember-cli-babel',
    'ember-cli-htmlbars': '$ember-cli-htmlbars',
  },
};

// ember-source 3.28 calls `project.bowerDependencies()`, which ember-cli 5
// removed, and ember-qunit 7+ needs a newer Ember
const emberThreeTooling = {
  'ember-cli': '~4.12.0',
  'ember-qunit': '^6.0.0',
  '@ember/test-helpers': '^2.0.0',
};

function withModernBuildTooling(emberSource) {
  return {
    dependencies: modernBuildTooling.dependencies,
    devDependencies: {
      'ember-source': emberSource,
      ...modernBuildTooling.devDependencies,
    },
    overrides: modernBuildTooling.overrides,
  };
}

module.exports = async function () {
  return {
    scenarios: [
      {
        name: 'ember-lts-3.28',
        npm: {
          devDependencies: {
            'ember-source': '~3.28.0',
            'ember-resolver': '^8.0.0',
            ...emberThreeTooling,
          },
        },
      },
      {
        name: 'ember-lts-4.4',
        npm: {
          devDependencies: {
            'ember-source': '~4.4.0',
            'ember-resolver': '^8.0.0',
            // ember-qunit 8+ extends a test adapter that Ember 4.4 lacks
            'ember-qunit': '^7.0.0',
          },
        },
      },
      {
        name: 'ember-release',
        npm: withModernBuildTooling(await getChannelURL('release')),
      },
      {
        name: 'ember-beta',
        npm: withModernBuildTooling(await getChannelURL('beta')),
      },
      {
        name: 'ember-canary',
        npm: withModernBuildTooling(await getChannelURL('canary')),
      },
      {
        name: 'ember-classic',
        env: {
          EMBER_OPTIONAL_FEATURES: JSON.stringify({
            'application-template-wrapper': true,
            'default-async-observers': false,
            'template-only-glimmer-components': false,
          }),
        },
        npm: {
          devDependencies: {
            'ember-source': '~3.28.0',
            ...emberThreeTooling,
          },
          ember: {
            edition: 'classic',
          },
          overrides: {
            'ember-source': '$ember-source',
          },
        },
      },
      embroiderSafe(),
      embroiderOptimized(),
      {
        name: 'default',
        npm: {
          devDependencies: {},
        },
      },
    ],
  };
};
