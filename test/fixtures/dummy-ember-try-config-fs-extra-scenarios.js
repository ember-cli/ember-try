module.exports = {
  scenarios: [
    {
      name: 'Ember try should succeed when using fs-extra version 6.x',
      npm: {
        devDependencies: {
          'watchpack-chokidar2': '2.0.1',
          'ember-try-test-suite-helper': '1.0.0',
          'fs-extra': '6.0.1',
        },
      },
    },
    {
      name: 'Ember try should fail when using fs-extra version 9.x',
      npm: {
        devDependencies: {
          'watchpack-chokidar2': '2.0.1',
          'ember-try-test-suite-helper': '1.0.0',
          'fs-extra': '9.0.1',
        },
      },
    },
  ],
};
