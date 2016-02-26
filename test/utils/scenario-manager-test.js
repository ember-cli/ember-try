'use strict';

var expect          = require('chai').expect;
var ScenarioManager = require('../../lib/utils/scenario-manager');
var CoreObject      = require('core-object');
var RSVP            = require('rsvp');

describe('scenarioManager', function() {

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
        expect(calledFirstAdapter).to.equal(true);
        expect(calledSecondAdapter).to.equal(true);
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
        expect(results).to.eql(['a', 'b', 'r', 'u', 'q', 'a']);
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
        expect(calledFirstAdapter).to.equal(true);
        expect(calledSecondAdapter).to.equal(true);
      });
    });
  });
});
