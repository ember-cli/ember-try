'use strict';

const expect = require('chai').expect;
const tmp = require('tmp-sync');
const path = require('path');
const RSVP = require('rsvp');
const fs = require('fs-extra');
const fixtureBower = require('../fixtures/bower.json');
const fixturePackage = require('../fixtures/package.json');
const writeJSONFile = require('../helpers/write-json-file');
const mockery = require('mockery');

/* Some of the tests in this file intentionally DO NOT stub dependency manager adapter*/
const StubDependencyAdapter = require('../helpers/stub-dependency-manager-adapter');
const generateMockRun = require('../helpers/generate-mock-run');

const remove = RSVP.denodeify(fs.remove);
const root = process.cwd();
const tmproot = path.join(root, 'tmp');

const config = {
  scenarios: [
    {
      name: 'first',
      bower: {
        dependencies: {
          ember: '1.13.0',
          bootstrap: null,
        },
      },
      npm: {
        dependencies: {
          'ember-try-test-suite-helper': '1.0.0',
        },
      },
    }, {
      name: 'second',
      bower: {
        dependencies: {
          ember: '2.0.0',
        },
        devDependencies: {
          jquery: '1.11.3',
        },
      },
      npm: {
        devDependencies: {
          'ember-try-test-suite-helper': '1.0.1',
        },
      },
    },
    {
      name: 'with-bower-resolutions',
      bower: {
        dependencies: {
          ember: 'components/ember#beta',
        },
        resolutions: {
          ember: 'beta',
        },
      },
      npm: {
        dependencies: {
          'ember-try-test-suite-helper': '1.0.0',
        },
      },
    }],
};

describe('tryEach', () => {
  let tmpdir;

  beforeEach(() => {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
    mockery.enable({
      warnOnUnregistered: false,
      useCleanCache: true,
    });
    require('chalk').enabled = false;
  });

  afterEach(() => {
    mockery.deregisterAll();
    mockery.disable();
    process.chdir(root);
    return remove(tmproot);
  });

  describe('with bower scenarios', () => {
    it('works without an initial bower.json', function() {
      this.timeout(300000);

      let mockedRun = generateMockRun('ember test', () => {
        return RSVP.resolve(0);
      });
      mockery.registerMock('./run', mockedRun);

      let output = [];
      let outputFn = function(log) {
        output.push(log);
      };

      let TryEachTask = require('../../lib/tasks/try-each');
      let tryEachTask = new TryEachTask({
        ui: { writeLine: outputFn },
        project: { root: tmpdir },
        config,
        _on() {},
      });

      writeJSONFile('package.json', fixturePackage);
      fs.mkdirSync('node_modules');

      expect(fs.existsSync('bower.json')).to.eql(false);
      return tryEachTask.run(config.scenarios, {}).then(() => {
        expect(output).to.include('All 3 scenarios succeeded');
        expect(fs.existsSync('bower.json')).to.eql(false);
        expect(fs.existsSync('bower_components')).to.eql(false);
      });
    });
  });

  describe('with both npm and bower', () => {
    it('succeeds when scenario\'s tests succeed', function() {
      this.timeout(300000);

      let mockedRun = generateMockRun('ember test', () => {
        return RSVP.resolve(0);
      });

      mockery.registerMock('./run', mockedRun);

      let output = [];
      let outputFn = function(log) {
        output.push(log);
      };

      let TryEachTask = require('../../lib/tasks/try-each');
      let tryEachTask = new TryEachTask({
        ui: { writeLine: outputFn },
        project: { root: tmpdir },
        config,
        _on() {},
      });

      writeJSONFile('package.json', fixturePackage);
      fs.writeFileSync('yarn.lock', '');
      fs.mkdirSync('node_modules');
      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then((exitCode) => {
        expect(exitCode).to.equal(0, 'exits 0 when all scenarios succeed');
        expect(output).to.include('Detected a yarn.lock file. Add `useYarn: true` to your `config/ember-try.js` configuration file if you want to use Yarn to install npm dependencies.');
        expect(output).to.include('Scenario first: SUCCESS');
        expect(output).to.include('Scenario second: SUCCESS');
        expect(output).to.include('Scenario with-bower-resolutions: SUCCESS');

        let tables = output.filter((line) => {
          return typeof line === "object";
        });

        expect(tables[0]).to.eql([
          [ 'ember-try-test-suite-helper', '1.0.0', '1.0.0', 'npm'],
          [ 'ember', '1.13.0', '1.13.0', 'bower' ],
          [ 'bootstrap', 'Not Installed', 'Not Installed', 'bower' ]
        ]);

        expect(tables[1]).to.eql([
          [ 'ember-try-test-suite-helper', '1.0.1', '1.0.1', 'npm'],
          [ 'ember', '2.0.0', '2.0.0', 'bower' ],
          [ 'jquery', '1.11.3', '1.11.3', 'bower' ]
        ]);

        expect(tables[2]).to.eql([
          [ 'ember-try-test-suite-helper', '1.0.0', '1.0.0', 'npm'],
          [ 'ember', 'components/ember#beta', '3.0.0-beta.2-beta+b4135dfe', 'bower' ]
        ]);

        expect(output).to.include('All 3 scenarios succeeded');
      });
    });

    it('fails scenarios when scenario\'s tests fail', function() {
      this.timeout(300000);

      let runTestCount = 0;
      let mockedRun = generateMockRun('ember test', () => {
        runTestCount++;
        if (runTestCount === 1) {
          return RSVP.reject(1);
        } else {
          return RSVP.resolve(0);
        }
      });

      mockery.registerMock('./run', mockedRun);

      let output = [];
      let outputFn = function(log) {
        output.push(log);
      };

      let TryEachTask = require('../../lib/tasks/try-each');
      let tryEachTask = new TryEachTask({
        ui: { writeLine: outputFn },
        project: { root: tmpdir },
        config,
        _on() {},
      });

      writeJSONFile('package.json', fixturePackage);
      fs.mkdirSync('node_modules');
      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then((exitCode) => {
        expect(exitCode).to.equal(1);
        expect(output).to.include('Scenario first: FAIL');
        expect(output).to.include('Scenario second: SUCCESS');
        expect(output).to.include('Scenario with-bower-resolutions: SUCCESS');
        expect(output).to.include('1 scenarios failed');
        expect(output).to.include('2 scenarios succeeded');
        expect(output).to.include('3 scenarios run');
      });
    });
  });

  describe('with stubbed dependency manager', () => {
    it('passes along timeout options to run', function() {
      // With stubbed dependency manager, timing out is warning for accidentally not using the stub
      this.timeout(1200);

      let config = {
        scenarios: [{
          name: 'first',
          dependencies: {
            ember: '1.13.0',
          },
        }],
      };
      let passedInOptions = false;
      let mockedRun = generateMockRun('ember serve', (command, args, options) => {
        if (options.timeout && options.timeout.length === 20000 && options.timeout.isSuccess) {
          passedInOptions = true;
        }
        return RSVP.resolve(0);
      });

      mockery.registerMock('./run', mockedRun);

      let output = [];
      let outputFn = function(log) {
        output.push(log);
      };

      let TryEachTask = require('../../lib/tasks/try-each');
      let tryEachTask = new TryEachTask({
        ui: { writeLine: outputFn },
        project: { root: tmpdir },
        config,
        commandArgs: ['ember', 'serve'],
        commandOptions: { timeout: { length: 20000, isSuccess: true } },
        dependencyManagerAdapters: [new StubDependencyAdapter()],
        _on() {},
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then((exitCode) => {
        expect(exitCode).to.equal(0, 'exits 0 when all scenarios succeed');
        expect(output).to.include('Scenario first: SUCCESS');
        expect(passedInOptions).to.equal(true, 'Should pass the options all the way down to run');
      });
    });

    describe('allowedToFail', () => {
      it('exits appropriately if all failures were allowedToFail', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(1200);

        let config = {
          scenarios: [{
            name: 'first',
            allowedToFail: true,
            dependencies: {
              ember: '1.13.0',
            },
          }, {
            name: 'second',
            allowedToFail: true,
            dependencies: {
              ember: '2.2.0',
            },
          }],
        };

        let mockedRun = generateMockRun('ember test', () => {
          return RSVP.reject(1);
        });
        mockery.registerMock('./run', mockedRun);

        let output = [];
        let outputFn = function(log) {
          output.push(log);
        };

        let TryEachTask = require('../../lib/tasks/try-each');
        let tryEachTask = new TryEachTask({
          ui: { writeLine: outputFn },
          project: { root: tmpdir },
          config,
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on() {},
        });

        return tryEachTask.run(config.scenarios, {}).then((exitCode) => {
          expect(output).to.include('Scenario first: FAIL (Allowed)');
          expect(output).to.include('Scenario second: FAIL (Allowed)');
          expect(output).to.include('2 scenarios failed (2 allowed)');
          expect(exitCode).to.equal(0, 'exits 0 when all failures were allowed');
        });
      });

      it('exits appropriately if any failures were not allowedToFail', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(1200);

        let config = {
          scenarios: [{
            name: 'first',
            dependencies: {
              ember: '1.13.0',
            },
          }, {
            name: 'second',
            allowedToFail: true,
            dependencies: {
              ember: '2.2.0',
            },
          }],
        };

        let mockedRun = generateMockRun('ember test', () => {
          return RSVP.reject(1);
        });
        mockery.registerMock('./run', mockedRun);

        let output = [];
        let outputFn = function(log) {
          output.push(log);
        };

        let TryEachTask = require('../../lib/tasks/try-each');
        let tryEachTask = new TryEachTask({
          ui: { writeLine: outputFn },
          project: { root: tmpdir },
          config,
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on() {},
        });

        return tryEachTask.run(config.scenarios, {}).then((exitCode) => {
          expect(output).to.include('Scenario first: FAIL');
          expect(output).to.include('Scenario second: FAIL (Allowed)');
          expect(output).to.include('2 scenarios failed (1 allowed)');
          expect(exitCode).to.equal(1, 'exits 1 when any failures were NOT allowed');
        });
      });

      it('exits appropriately if all allowedToFail pass', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(1200);

        let config = {
          scenarios: [{
            name: 'first',
            allowedToFail: true,
            dependencies: {
              ember: '1.13.0',
            },
          }, {
            name: 'second',
            allowedToFail: true,
            dependencies: {
              ember: '2.2.0',
            },
          }],
        };

        let mockedRun = generateMockRun('ember test', () => {
          return RSVP.resolve(0);
        });
        mockery.registerMock('./run', mockedRun);

        let output = [];
        let outputFn = function(log) {
          output.push(log);
        };

        let TryEachTask = require('../../lib/tasks/try-each');
        let tryEachTask = new TryEachTask({
          ui: { writeLine: outputFn },
          project: { root: tmpdir },
          config,
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on() {},
        });

        return tryEachTask.run(config.scenarios, {}).then((exitCode) => {
          expect(output).to.include('Scenario first: SUCCESS');
          expect(output).to.include('Scenario second: SUCCESS');
          expect(output).to.include('All 2 scenarios succeeded');
          expect(exitCode).to.equal(0, 'exits 0 when all pass');
        });
      });
    });

    describe('configurable command', () => {
      it('defaults to `ember test`', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(1200);

        let config = {
          scenarios: [{
            name: 'first',
            dependencies: {
              ember: '1.13.0',
            },
          }, {
            name: 'second',
            dependencies: {
              ember: '2.2.0',
            },
          }],
        };

        let ranDefaultCommand = false;

        let mockedRun = generateMockRun('ember test', () => {
          ranDefaultCommand = true;
          return RSVP.resolve(0);
        });

        mockery.registerMock('./run', mockedRun);

        let output = [];
        let outputFn = function(log) {
          output.push(log);
        };

        let TryEachTask = require('../../lib/tasks/try-each');
        let tryEachTask = new TryEachTask({
          ui: { writeLine: outputFn },
          project: { root: tmpdir },
          config,
          commandArgs: [],
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on() {},
        });

        return tryEachTask.run(config.scenarios, {}).then((exitCode) => {
          expect(exitCode).to.equal(0, 'exits 0 when all scenarios succeed');
          expect(output).to.include('Scenario first: SUCCESS');
          expect(output).to.include('Scenario second: SUCCESS');

          expect(ranDefaultCommand).to.equal(true, 'Should run the default command');
        });
      });

      it('allows passing in of the command to run (overrides config file)', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(1200);

        let config = {
          command: 'ember test-this',
          scenarios: [{
            name: 'first',
            dependencies: {
              ember: '1.13.0',
            },
          }],
        };
        let ranPassedInCommand = false;
        let mockedRun = generateMockRun('ember serve', () => {
          ranPassedInCommand = true;
          return RSVP.resolve(0);
        });
        mockery.registerMock('./run', mockedRun);

        let output = [];
        let outputFn = function(log) {
          output.push(log);
        };

        let TryEachTask = require('../../lib/tasks/try-each');
        let tryEachTask = new TryEachTask({
          ui: { writeLine: outputFn },
          project: { root: tmpdir },
          config,
          commandArgs: ['ember', 'serve'],
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on() {},
        });

        return tryEachTask.run(config.scenarios, {}).then((exitCode) => {
          expect(exitCode).to.equal(0, 'exits 0 when all scenarios succeed');
          expect(output).to.include('Scenario first: SUCCESS');
          expect(ranPassedInCommand).to.equal(true, 'Should run the passed in command');
        });
      });

      it('uses command from config', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(1200);

        let config = {
          command: 'ember test --test-port=2345',
          scenarios: [{
            name: 'first',
            dependencies: {
              ember: '1.13.0',
            },
          }, {
            name: 'second',
            dependencies: {
              ember: '2.2.0',
            },
          }, {
            name: 'different',
            command: 'npm run-script different',
            dependencies: {
              ember: '2.0.0',
            },
          }],
        };

        let ranDefaultCommandCount = 0;
        let ranScenarioCommandCount = 0;
        let mockedRun = generateMockRun([{
          command: 'ember test --test-port=2345',
          callback() {
            ranDefaultCommandCount++;
            return RSVP.resolve(0);
          },
        }, {
          command: 'npm run-script different',
          callback() {
            ranScenarioCommandCount++;
            return RSVP.resolve(0);
          },
        }]);
        mockery.registerMock('./run', mockedRun);

        let output = [];
        let outputFn = function(log) {
          output.push(log);
        };

        let TryEachTask = require('../../lib/tasks/try-each');
        let tryEachTask = new TryEachTask({
          ui: { writeLine: outputFn },
          project: { root: tmpdir },
          config,
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on() {},
        });

        return tryEachTask.run(config.scenarios, {}).then((exitCode) => {
          expect(exitCode).to.equal(0, 'exits 0 when all scenarios succeed');

          expect(output).to.include('Scenario first: SUCCESS');
          expect(output).to.include('Scenario second: SUCCESS');
          expect(output).to.include('Scenario different: SUCCESS');

          expect(ranDefaultCommandCount).to.equal(2, 'Should run the default command scenarios without their own commands specified');
          expect(ranScenarioCommandCount).to.equal(1, 'Should run the scenario command for scenario that specified it');
        });
      });

      it('allows passing options to the command run', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(10000);

        let config = {
          scenarios: [{
            name: 'first',
            dependencies: {
              ember: '1.13.0',
            },
          }],
        };

        let output = [];
        let outputFn = function(log) {
          output.push(log);
        };

        let TryEachTask = require('../../lib/tasks/try-each');
        let tryEachTask = new TryEachTask({
          ui: { writeLine: outputFn },
          project: { root: tmpdir },
          config,
          commandArgs: ['ember', 'help', '--json', 'true'],
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on() {},
        });

        return tryEachTask.run(config.scenarios, {}).then((exitCode) => {
          expect(exitCode).to.equal(0, 'exits 0 when all scenarios succeed');
          expect(output).to.include('Scenario first: SUCCESS', 'Passing scenario means options were passed along');
        });
      });
    });

    describe('configurable env', () => {
      it('runs command with env from config', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(1200);

        let config = {
          scenarios: [{
            name: 'first',
            command: 'true',
            env: {
              USE_THIS: 'yep',
            },
          }, {
            name: 'second',
            command: 'true',
          }],
        };

        process.env['THIS_SHOULD_EXIST_IN_CMD_OPTS'] = 'true';
        let actualOptions = [];
        let mockedRun = generateMockRun('true', (actualCommand, actualArgs, opts) => {
          actualOptions.push(opts);
          return RSVP.resolve(0);
        });
        mockery.registerMock('./run', mockedRun);

        let output = [];
        let outputFn = function(log) {
          output.push(log);
        };

        let TryEachTask = require('../../lib/tasks/try-each');
        let tryEachTask = new TryEachTask({
          ui: { writeLine: outputFn },
          project: { root: tmpdir },
          config,
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on() {},
        });

        return tryEachTask.run(config.scenarios, {}).then((exitCode) => {
          expect(exitCode).to.equal(0, 'exits 0 when all scenarios succeed');

          expect(output).to.include('Scenario first: SUCCESS');
          expect(output).to.include('Scenario second: SUCCESS');

          expect(actualOptions[0].env).to.include({ USE_THIS: 'yep', 'THIS_SHOULD_EXIST_IN_CMD_OPTS': 'true' });
          expect(actualOptions[1].env).to.eql(undefined);
        });
      });
    });

    it('sets EMBER_TRY_CURRENT_SCENARIO', function() {
      // With stubbed dependency manager, timing out is warning for accidentally not using the stub
      this.timeout(1200);

      let config = {
        scenarios: [{
          name: 'first',
          dependencies: {
            ember: '1.13.0',
          },
        }],
      };

      let output = [];
      let outputFn = function(log) {
        output.push(log);
      };

      let scenarios = [];
      let mockRunCommand = function() {
        let currentScenario = process.env.EMBER_TRY_CURRENT_SCENARIO;
        scenarios.push(currentScenario);
        return RSVP.resolve(true);
      };

      let TryEachTask = require('../../lib/tasks/try-each');
      let tryEachTask = new TryEachTask({
        ui: { writeLine: outputFn },
        project: { root: tmpdir },
        config,
        dependencyManagerAdapters: [new StubDependencyAdapter()],
        _on() {},
        _runCommand: mockRunCommand,
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then((exitCode) => {
        expect(exitCode).to.equal(0, 'exits 0 when all scenarios succeed');
        expect(scenarios).to.eql(['first']);
        let currentScenarioIsUndefined = process.env.EMBER_TRY_CURRENT_SCENARIO === undefined;
        expect(currentScenarioIsUndefined).to.equal(true);
      });
    });
  });
});
