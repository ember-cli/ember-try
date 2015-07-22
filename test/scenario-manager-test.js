var ScenarioManager = require('../lib/utils/scenario-manager');
var should = require("should");

describe('scenarioManager', function() {
  describe('#_bowerJSONForScenario', function() {
    it('should change specified bower dependency versions', function() {
      var scenarioManager = new ScenarioManager();
      var bowerJSON = { dependencies: { 'jQuery': '1.11.1' }, resolutions: {} };
      var scenario =  { dependencies: { 'jQuery': '2.1.3' } };

      bowerJSON = scenarioManager._bowerJSONForScenario(bowerJSON, scenario);

      bowerJSON.dependencies['jQuery'].should.equal('2.1.3');
    });

    it('should change specified bower dev dependency versions', function() {
      var scenarioManager = new ScenarioManager();
      var bowerJSON = { devDependencies: { 'jQuery': '1.11.1' }, resolutions: {} };
      var scenario =  { devDependencies: { 'jQuery': '2.1.3' } };

      bowerJSON = scenarioManager._bowerJSONForScenario(bowerJSON, scenario);

      bowerJSON.devDependencies['jQuery'].should.equal('2.1.3');
    });

    it('should add to resolutions', function() {
      var scenarioManager = new ScenarioManager();
      var bowerJSON = { dependencies: { 'jQuery': '1.11.1' }, resolutions: {} };
      var scenario =  { dependencies: { 'jQuery': '2.1.3' } };

      bowerJSON = scenarioManager._bowerJSONForScenario(bowerJSON, scenario);

      bowerJSON.resolutions['jQuery'].should.equal('2.1.3');
    });

    it('should set custom resolutions', function() {
      var scenarioManager = new ScenarioManager();
      var bowerJSON = { dependencies: { 'ember': '1.13.5' }, resolutions: {} };
      var scenario =  {
        dependencies: { 'ember': 'components/ember#canary' },
        resolutions:  { 'ember': 'canary' }
      };

      bowerJSON = scenarioManager._bowerJSONForScenario(bowerJSON, scenario);

      bowerJSON.resolutions['ember'].should.equal('canary');
    });
  });
});
