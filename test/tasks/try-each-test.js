'use strict';

let expect = require('chai').expect;
let tmp = require('tmp-sync');
let path = require('path');
let RSVP = require('rsvp');
let fs = require('fs-extra');
let fixtureBower = require('../fixtures/bower.json');
let fixturePackage = require('../fixtures/package.json');
let writeJSONFile = require('../helpers/write-json-file');
let mockery = require('mockery');

/* Some of the tests in this file intentionally DO NOT stub dependency manager adapter*/
let StubDependencyAdapter = require('../helpers/stub-dependency-manager-adapter');
let generateMockRun = require('../helpers/generate-mock-run');

let remove = RSVP.denodeify(fs.remove);
let root = process.cwd();
let tmproot = path.join(root, 'tmp');
let tmpdir;

let legacyConfig = {
  scenarios: [
    {
      name: 'default',
      dependencies: {},
    },
    {
      name: 'first',
      dependencies: {
        ember: '1.13.0',
      },
    },
    {
      name: 'second',
      dependencies: {
        ember: '2.0.0',
      },
    },
    {
      name: 'with-dev-deps',
      dependencies: {
        ember: '2.0.0',
      },
      devDependencies: {
        jquery: '1.11.3',
      },
    },
    {
      name: 'with-resolutions',
      dependencies: {
        ember: 'components/ember#beta',
      },
      resolutions: {
        ember: 'beta',
      },
    },
  ],
};

let config = {
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
          'ember-cli-deploy': '0.5.0',
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
          'ember-cli-deploy': '0.5.1',
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
          'ember-cli-deploy': '0.5.1',
        },
      },
    }],
};

describe('tryEach', () => {
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

  describe('with legacy config', () => {
    it('succeeds when scenario\'s tests succeed', function() {
      this.timeout(30000);

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
        config: legacyConfig,
        _on() {},
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(legacyConfig.scenarios, {}).then((exitCode) => {
        expect(exitCode).to.equal(0, 'exits 0 when all scenarios succeed');
        expect(output).to.include('Scenario default: SUCCESS');
        expect(output).to.include('Scenario first: SUCCESS');
        expect(output).to.include('Scenario second: SUCCESS');
        expect(output).to.include('Scenario with-dev-deps: SUCCESS');
        expect(output).to.include('Scenario with-resolutions: SUCCESS');

        expect(output).to.include('All 5 scenarios succeeded');
      }).catch((err) => {
        console.log(err);
        expect(true).to.equal(false, 'Assertions should run');
      });
    });

    it('fails scenarios when scenario\'s tests fail', function() {
      this.timeout(30000);

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
        config: legacyConfig,
        _on() {},
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(legacyConfig.scenarios, {}).then((exitCode) => {
        expect(exitCode).to.equal(1);
        expect(output).to.include('Scenario default: FAIL');
        expect(output).to.include('Scenario first: SUCCESS');
        expect(output).to.include('Scenario second: SUCCESS');
        expect(output).to.include('Scenario with-dev-deps: SUCCESS');
        expect(output).to.include('Scenario with-resolutions: SUCCESS');
        expect(output).to.include('1 scenarios failed');
        expect(output).to.include('4 scenarios succeeded');
        expect(output).to.include('5 scenarios run');
      }).catch((err) => {
        console.log(err);
        expect(true).to.equal(false, 'Assertions should run');
      });
    });
  });

  describe('with bower scenarios', () => {
    it('works without an initial bower.json', function() {
      this.timeout(30000);

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
        config: legacyConfig,
        _on() {},
      });

      expect(fs.existsSync('bower.json')).to.eql(false);
      return tryEachTask.run(legacyConfig.scenarios, {}).then(() => {
        expect(output).to.include('All 5 scenarios succeeded');
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
        expect(output).to.include('Detected a yarn.lock file, add useYarn: true to your configuration if you want to use Yarn to install npm dependencies.');
        expect(output).to.include('Scenario first: SUCCESS');
        expect(output).to.include('Scenario second: SUCCESS');
        expect(output).to.include('Scenario with-bower-resolutions: SUCCESS');
        expect(output).to.include('All 3 scenarios succeeded');
      }).catch((err) => {
        console.log(err);
        expect(true).to.equal(false, 'Assertions should run');
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
      }).catch((err) => {
        console.log(err);
        expect(true).to.equal(false, 'Assertions should run');
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
      }).catch((err) => {
        console.log(err);
        expect(true).to.equal(false, 'Assertions should run');
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
        }).catch((err) => {
          console.log(err);
          expect(true).to.equal(false, 'Assertions should run');
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
        }).catch((err) => {
          console.log(err);
          expect(true).to.equal(false, 'Assertions should run');
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
        }).catch((err) => {
          console.log(err);
          expect(true).to.equal(false, 'Assertions should run');
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
        }).catch(() => {
          expect(true).to.equal(false, 'Assertions should run');
        });
      });

      it('allows passing in of the command to run', function() {
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
        }).catch((err) => {
          console.log(err);
          expect(true).to.equal(false, 'Assertions should run');
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
        }).catch((err) => {
          console.log(err);
          expect(true).to.equal(false, 'Assertions should run');
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
        }).catch((err) => {
          console.log(err);
          expect(true).to.equal(false, 'Assertions should run');
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
      }).catch((err) => {
        console.log(err);
        expect(true).to.equal(false, 'Assertions should run');
      });
    });
  });
});
