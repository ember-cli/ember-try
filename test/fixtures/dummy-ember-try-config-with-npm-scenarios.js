module.exports = {
  useYarn: true,
  scenarios: [
    {
      name: 'test1',
      bower: {
        dependencies: {
          ember: '1.10.0'
        }
      }
    },
    {
      name: 'test2',
      command: 'ember test',
      npm: {
        dependencies: {
          'ember-moment': '7.5.0'
        }
      }
    }
  ]
};
