module.exports = {
  scenarios: [
    {
      name: 'test1',
      bower: {
        dependencies: {
          ember: '2.18.0'
        }
      }
    },
    {
      name: 'test2',
      command: 'ember test',
      npm: {
        dependencies: {
          'ember-try-test-suite-helper': '1.0.0'
        }
      }
    }
  ]
};
