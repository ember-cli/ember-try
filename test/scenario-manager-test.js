var ScenarioManager = require('../lib/utils/scenario-manager');
var CoreObject = require('core-object');
var RSVP = require('rsvp');
var should = require('should');

describe('scenarioManager', function() {
  describe('new', function() {
    describe('dependency manager adapter creation', function() {
      it('creates npm adapter when config has npm key', function() {
        var manager = new ScenarioManager({ config: { scenarios: [{ npm: {} }]}, project: {root: 'here'}});
        manager.dependencyManagerAdapters[0].configKey.should.equal('npm');
        manager.dependencyManagerAdapters.length.should.equal(1);
      });

      it('creates bower adapter when config has bower key', function() {
        var manager = new ScenarioManager({ config: { scenarios: [{ bower: {} }]}, project: {root: 'here'}});
        manager.dependencyManagerAdapters[0].configKey.should.equal('bower');
        manager.dependencyManagerAdapters.length.should.equal(1);
      });

      it('creates both adapters when it has both keys', function() {
        var manager = new ScenarioManager({ config: { scenarios: [{ bower: {}, npm: {}}]}, project: {root: 'here'}});
        manager.dependencyManagerAdapters[0].configKey.should.equal('npm');
        manager.dependencyManagerAdapters[1].configKey.should.equal('bower');
        manager.dependencyManagerAdapters.length.should.equal(2);
      });

      it('creates bower adapter when legacy dependenies key', function() {
        var manager = new ScenarioManager({ config: { scenarios: [{ dependencies: {}}]}, project: {root: 'here'}});
        manager.dependencyManagerAdapters[0].configKey.should.equal('bower');
        manager.dependencyManagerAdapters.length.should.equal(1);
      });

      it('creates bower adapter when legacy devDependencies key', function() {
        var manager = new ScenarioManager({ config: { scenarios: [{ devDependencies: {}}]}, project: {root: 'here'}});
        manager.dependencyManagerAdapters[0].configKey.should.equal('bower');
        manager.dependencyManagerAdapters.length.should.equal(1);
      });
    });
  });

  describe('#setup', function() {
    it('sets up each of the dependency managers', function() {
      var calledFirstAdapter = false;
      var calledSecondAdapter = false;
      var fakeAdapters = [
        new CoreObject({
          setup: function() {
            calledFirstAdapter = true;
          }
        }),
        new CoreObject({
          setup: function() {
            calledSecondAdapter = true;
          }
        })
      ];

      return new ScenarioManager({dependencyManagerAdapters: fakeAdapters}).setup().then(function() {
        calledFirstAdapter.should.equal(true);
        calledSecondAdapter.should.equal(true);
      });
    });
  });

  describe('#changeTo', function() {
    it('changes dependency sets on each of the managers, and concats results', function() {
      var fakeAdapters = [
        new CoreObject({
          changeToDependencySet: function() {
            return RSVP.resolve(['a', 'b', 'r']);
          }
        }),
        new CoreObject({
          changeToDependencySet: function() {
            return RSVP.resolve(['u', 'q', 'a']);
          }
        })
      ];

      var manager = new ScenarioManager({dependencyManagerAdapters: fakeAdapters});
      return manager.changeTo({}).then(function(results) {
        results.should.containDeepOrdered(['a', 'b', 'r', 'u', 'q', 'a']);
      });
    });
  });

  describe('#cleanup', function() {
    it('cleans up each dependency manager', function() {
      var calledFirstAdapter = false;
      var calledSecondAdapter = false;
      var fakeAdapters = [
        new CoreObject({
          cleanup: function() {
            calledFirstAdapter = true;
          }
        }),
        new CoreObject({
          cleanup: function() {
            calledSecondAdapter = true;
          }
        })
      ];

      return new ScenarioManager({dependencyManagerAdapters: fakeAdapters}).cleanup().then(function() {
        calledFirstAdapter.should.equal(true);
        calledSecondAdapter.should.equal(true);
      });
    });
  });
});
