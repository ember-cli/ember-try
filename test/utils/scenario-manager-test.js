import { expect } from 'chai';
import ScenarioManager from '../../lib/utils/scenario-manager.js';

describe('scenarioManager', () => {
  it('does not require any dependency managers', () => {
    new ScenarioManager({ dependencyManagerAdapters: [] });
  });

  describe('#setup', () => {
    it('sets up each of the dependency managers', () => {
      let calledFirstAdapter = false;
      let calledSecondAdapter = false;
      let fakeAdapters = [
        new (class {
          setup() {
            calledFirstAdapter = true;
          }
        })(),
        new (class {
          setup() {
            calledSecondAdapter = true;
          }
        })(),
      ];

      return new ScenarioManager({ dependencyManagerAdapters: fakeAdapters }).setup().then(() => {
        expect(calledFirstAdapter).to.equal(true);
        expect(calledSecondAdapter).to.equal(true);
      });
    });
  });

  describe('#changeTo', () => {
    it('changes dependency sets on each of the managers, in order, and concats results', () => {
      let fakeAdapters = [
        new (class {
          configKey = 'adapterA';
          changeToDependencySet() {
            return Promise.resolve(['a', 'b', 'r']);
          }
        })(),
        new (class {
          configKey = 'adapterB';
          changeToDependencySet() {
            return Promise.resolve(['u', 'q', 'a']);
          }
        })(),
      ];

      let manager = new ScenarioManager({ dependencyManagerAdapters: fakeAdapters });
      return manager.changeTo({ adapterA: {}, adapterB: {} }).then((results) => {
        expect(results).to.eql(['a', 'b', 'r', 'u', 'q', 'a']);
      });
    });
  });

  describe('#cleanup', () => {
    it('cleans up each dependency manager', () => {
      let calledFirstAdapter = false;
      let calledSecondAdapter = false;
      let fakeAdapters = [
        new (class {
          cleanup() {
            calledFirstAdapter = true;
          }
        })(),
        new (class {
          cleanup() {
            calledSecondAdapter = true;
          }
        })(),
      ];

      return new ScenarioManager({ dependencyManagerAdapters: fakeAdapters }).cleanup().then(() => {
        expect(calledFirstAdapter).to.equal(true);
        expect(calledSecondAdapter).to.equal(true);
      });
    });
  });
});
