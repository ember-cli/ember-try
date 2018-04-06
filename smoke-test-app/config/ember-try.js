module.exports = {
  scenarios: [
    {
      name: 'ember-lts-2.12',
      npm: {
        devDependencies: {
          'ember-source': '~2.12.0'
        }
      }
    },
    {
      name: 'ember-lts-2.16',
      npm: {
        devDependencies: {
          'ember-source': '~2.16.0'
        }
      }
    },
    {
      name: 'default',
      npm: {
        devDependencies: {}
      }
    }
  ]
};
