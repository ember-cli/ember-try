const smokeTestAppConfig = require('../../smoke-test-app/tests/dummy/config/ember-try');

// `try:ember` adds release, beta, and canary scenarios from `ember-try-config`.
// These names replace them with scenarios that can build Ember 7.
const channelScenarioNames = ['ember-release', 'ember-beta', 'ember-canary'];

module.exports = async function () {
  const { scenarios } = await smokeTestAppConfig();

  return {
    scenarios: [
      {
        name: 'test1',
        npm: {
          devDependencies: {
            'ember-try-test-suite-helper': '1.0.0',
          },
        },
      },
      ...scenarios.filter((scenario) => channelScenarioNames.includes(scenario.name)),
    ],
  };
};
