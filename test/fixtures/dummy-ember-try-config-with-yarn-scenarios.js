module.exports = {
  useYarn: true,
  scenarios: [
    {
      name: 'test2',
      command: 'ember test',
      npm: {
        dependencies: {
          'ember-try-test-suite-helper': '1.0.0',
        },
      },
    },
  ],
};
