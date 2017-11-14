'use strict';

var expect = require('chai').expect;
var ScenarioManager = require('../../lib/utils/scenario-manager');
var CoreObject = require('core-object');
var RSVP = require('rsvp');

describe('scenarioManager', function() {
  var hooks;
  var BaseAdapter = CoreObject.extend({
    setup() {
      hooks.push(['setup', this.name]);
    },

    shouldProcessDependencySet(depSet) {
      hooks.push(['shouldProcessDependencySet', this.name, depSet]);
    },

    changeToDependencySet(depSet) {
      hooks.push(['changeToDependencySet', this.name, depSet]);
    },

    cleanup() {
      hooks.push(['cleanup', this.name]);
    }
  });

  beforeEach(function() {
    hooks = [];
  });

  describe('#setup', function() {
    it('sets up each of the dependency managers', function() {
      var fakeAdapters = [
        new BaseAdapter({
          name: 'first',
        }),
        new BaseAdapter({
          name: 'second',
        })
      ];

      return new ScenarioManager({ dependencyManagerAdapters: fakeAdapters }).setup().then(function() {
        expect(hooks).to.deep.equal([
          ['setup', 'first'],
          ['setup', 'second'],
        ]);
      });
    });
  });

  describe('#changeTo', function() {
    it('changes dependency sets on each of the managers, in order, and concats results', function() {
      var fakeAdapters = [
        new (BaseAdapter.extend({
          name: 'first',
          changeToDependencySet: function() {
            this._super.apply(this, arguments);
            return RSVP.resolve(['a', 'b', 'r']);
          }
        }))(),
        new (BaseAdapter.extend({
          name: 'second',
          changeToDependencySet: function() {
            this._super.apply(this, arguments);
            return RSVP.resolve(['u', 'q', 'a']);
          }
        }))()
      ];

      var manager = new ScenarioManager({ dependencyManagerAdapters: fakeAdapters });
      return manager.changeTo({}).then(function(results) {
        expect(results).to.eql(['a', 'b', 'r', 'u', 'q', 'a']);
        expect(hooks).to.deep.equal([
          ['changeToDependencySet', 'first', {}],
          ['changeToDependencySet', 'second', {}],
        ]);
      });
    });
  });

  describe('#cleanup', function() {
    it('cleans up each dependency manager', function() {
      var fakeAdapters = [
        new BaseAdapter({
          name: 'first',
        }),
        new BaseAdapter({
          name: 'second',
        })
      ];

      return new ScenarioManager({ dependencyManagerAdapters: fakeAdapters }).cleanup().then(function() {
        expect(hooks).to.deep.equal([
          ['cleanup', 'first'],
          ['cleanup', 'second'],
        ]);
      });
    });
  });
});
