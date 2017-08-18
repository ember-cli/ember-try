'use strict';

let expect = require('chai').expect;
let ScenarioManager = require('../../lib/utils/scenario-manager');
let CoreObject = require('core-object');
let RSVP = require('rsvp');

describe('scenarioManager', () => {

  describe('#setup', () => {
    it('sets up each of the dependency managers', () => {
      let calledFirstAdapter = false;
      let calledSecondAdapter = false;
      let fakeAdapters = [
        new CoreObject({
          setup() {
            calledFirstAdapter = true;
          },
        }),
        new CoreObject({
          setup() {
            calledSecondAdapter = true;
          },
        }),
      ];

      return new ScenarioManager({ dependencyManagerAdapters: fakeAdapters }).setup().then(() => {
        expect(calledFirstAdapter).to.equal(true);
        expect(calledSecondAdapter).to.equal(true);
      });
    });
  });

  describe('#changeTo', () => {
    it('changes dependency sets on each of the managers, and concats results', () => {
      let fakeAdapters = [
        new CoreObject({
          changeToDependencySet() {
            return RSVP.resolve(['a', 'b', 'r']);
          },
        }),
        new CoreObject({
          changeToDependencySet() {
            return RSVP.resolve(['u', 'q', 'a']);
          },
        }),
      ];

      let manager = new ScenarioManager({ dependencyManagerAdapters: fakeAdapters });
      return manager.changeTo({}).then((results) => {
        expect(results).to.eql(['a', 'b', 'r', 'u', 'q', 'a']);
      });
    });
  });

  describe('#cleanup', () => {
    it('cleans up each dependency manager', () => {
      let calledFirstAdapter = false;
      let calledSecondAdapter = false;
      let fakeAdapters = [
        new CoreObject({
          cleanup() {
            calledFirstAdapter = true;
          },
        }),
        new CoreObject({
          cleanup() {
            calledSecondAdapter = true;
          },
        }),
      ];

      return new ScenarioManager({ dependencyManagerAdapters: fakeAdapters }).cleanup().then(() => {
        expect(calledFirstAdapter).to.equal(true);
        expect(calledSecondAdapter).to.equal(true);
      });
    });
  });
});
