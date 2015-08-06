var path = require('path');
var fs   = require('fs');

function config(options) {
  var configFile = path.join(options.project.root, 'config', 'ember-try.js');
  if (fs.existsSync(configFile)) {
    return require(configFile);
  } else {
    return defaultConfig();
  }
}

module.exports = config;

function defaultConfig() {
  return {
    scenarios: [
      {
        name: 'default',
        bower: {
          dependencies: { }
        } /* No dependencies needed as the
           * default is already specified in
           * the consuming app's bower.json */
      },
      {
        name: 'ember-release',
        bower: {
          dependencies: {
            ember: 'release'
          }
        }
      },
      {
        name: 'ember-beta',
        bower: {
          dependencies: {
            ember: 'beta'
          }
        }
      },
      {
        name: 'ember-canary',
        bower: {
          dependencies: {
            ember: 'canary'
          }
        }
      }
    ]
  };
}
