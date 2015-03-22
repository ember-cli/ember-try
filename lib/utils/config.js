var path = require('path');
var fs   = require('fs');

function config(options){
  var configFile = path.join(options.project.root, 'config', 'ember-try.js');
  if(fs.existsSync(configFile)){
    return require(configFile);
  }
  else {
    return defaultConfig();
  }
}

module.exports = config;

function defaultConfig(){
  return {
    scenarios: [
      {
        name: 'ember 1.10',
        dependencies: {
          "ember": "1.10.0"
        }
      },
      {
        name: 'ember 1.11.0-beta.5',
        dependencies: {
          "ember": "1.11.0-beta.5"
        }
      }

    ]
  }
}
