var ScenarioManager = require('../lib/utils/scenario-manager');
var should = require("should");

describe('scenarioManager', function() {
  describe('#_manifestJSONForScenario', function() {
    it('should change specified bower dependency versions (legacy config schema)', function() {
      var scenarioManager = new ScenarioManager();
      var bowerJSON = {
        dependencies: {
          'jQuery': '1.11.1'
        }
      };
      var scenario = {
        dependencies: {
          'jQuery': '2.1.3'
        }
      };

      var newBowerJSON = scenarioManager
        ._manifestJSONForScenario(bowerJSON, scenario);
      newBowerJSON.dependencies['jQuery'].should.equal('2.1.3');
    });

    it('should change specified bower dependency versions (1.0 config schema)', function() {
      var scenarioManager = new ScenarioManager();
      var bowerJSON = {
        dependencies: {
          jquery: '1.11.1'
        }
      };
      var scenario = {
        bower: {
          dependencies: {
            jquery: '2.1.3'
          }
        }
      };

      var newBowerJSON = scenarioManager
        ._manifestJSONForScenario(bowerJSON, scenario);
      newBowerJSON.dependencies['jquery'].should.equal('2.1.3');
    });

    it('should change favor 1.0 config schema over legacy schema for bower scenario deps', function() {
      var scenarioManager = new ScenarioManager();
      var bowerJSON = {
        dependencies: {
          jquery: '1.11.1'
        }
      };
      var scenario = {
        dependencies: {
          jquery: '~2.0.0'
        },
        bower: {
          dependencies: {
            jquery: '2.1.3'
          }
        }
      };

      var newBowerJSON = scenarioManager
        ._manifestJSONForScenario(bowerJSON, scenario);
      newBowerJSON.dependencies['jquery'].should.equal('2.1.3');
    });

    it('should respect other root keys in the scenario (i.e., for npm)', function() {
      var scenarioManager = new ScenarioManager();
      var packageJSON = {
        dependencies: {
          'jQuery': '1.11.1'
        }
      };
      var scenario = {
        dependencies: {
          'jQuery': '2.1.3'
        },
        npm: {
          dependencies: {
            lodash: '^2.0.0'
          }
        }
      };

      var newPackageJSON = scenarioManager
        ._manifestJSONForScenario(packageJSON, scenario, 'npm');
      newPackageJSON.dependencies['lodash'].should.equal('^2.0.0');
    });

    it('should change specified bower dev dependency versions', function() {
      var scenarioManager = new ScenarioManager();
      var bowerJSON = {
        devDependencies: {
          'jQuery': '1.11.1'
        }
      };
      var scenario = {
        devDependencies: {
          'jQuery': '2.1.3'
        }
      };

      bowerJSON = scenarioManager
        ._manifestJSONForScenario(bowerJSON, scenario);
      bowerJSON.devDependencies['jQuery'].should.equal('2.1.3');
    });

    it('should add to resolutions', function() {
      var scenarioManager = new ScenarioManager();
      var bowerJSON = {
        dependencies: {
          'jQuery': '1.11.1'
        }
      };
      var scenario = {
        dependencies: {
          'jQuery': '2.1.3'
        }
      };

      bowerJSON = scenarioManager
        ._manifestJSONForScenario(bowerJSON, scenario);
      bowerJSON.resolutions['jQuery'].should.equal('2.1.3');
    });

    it('should set custom resolutions', function() {
      var scenarioManager = new ScenarioManager();
      var bowerJSON = {
        dependencies: {
          'ember': '1.13.5'
        }
      };
      var scenario = {
        dependencies: {
          'ember': 'components/ember#canary'
        },
        resolutions: {
          'ember': 'canary'
        }
      };

      bowerJSON = scenarioManager
        ._manifestJSONForScenario(bowerJSON, scenario);
      bowerJSON.resolutions['ember'].should.equal('canary');
    });
  });
});
