'use strict';

var expect          = require('chai').expect;
var tmp             = require('tmp-sync');
var path            = require('path');
var RSVP            = require('rsvp');
var fs              = require('fs-extra');
var fixtureBower    = require('../fixtures/bower.json');
var fixturePackage  = require('../fixtures/package.json');
var writeJSONFile   = require('../helpers/write-json-file');
var mockery         = require('mockery');

/* Some of the tests in this file intentionally DO NOT stub dependency manager adapter*/
var StubDependencyAdapter = require('../helpers/stub-dependency-manager-adapter');
var generateMockRun       = require('../helpers/generate-mock-run');

var remove  = RSVP.denodeify(fs.remove);
var root    = process.cwd();
var tmproot = path.join(root, 'tmp');
var tmpdir;

var legacyConfig = {
  scenarios: [
    {
      name: 'default',
      dependencies: {}
    },
    {
      name: 'first',
      dependencies: {
        ember: '1.13.0'
      }
    },
    {
      name: 'second',
      dependencies: {
        ember: '2.0.0'
      }
    },
    {
      name: 'with-dev-deps',
      dependencies: {
        ember: '2.0.0'
      },
      devDependencies: {
        jquery: '1.11.3'
      }
    },
    {
      name: 'with-resolutions',
      dependencies: {
        ember: 'components/ember#beta'
      },
      resolutions: {
        ember: 'beta'
      }
    }
  ]
};

var config = {
  scenarios: [
    {
      name: 'first',
      bower: {
        dependencies: {
          ember: '1.13.0'
        }
      },
      npm: {
        dependencies: {
          'ember-cli-deploy': '0.5.0'
        }
      }
    }, {
      name: 'second',
      bower: {
        dependencies: {
          ember: '2.0.0'
        },
        devDependencies: {
          jquery: '1.11.3'
        }
      },
      npm: {
        devDependencies: {
          'ember-cli-deploy': '0.5.1'
        }
      }
    },
    {
      name: 'with-bower-resolutions',
      bower: {
        dependencies: {
          ember: 'components/ember#beta'
        },
        resolutions: {
          ember: 'beta'
        }
      },
      npm: {
        dependencies: {
          'ember-cli-deploy': '0.5.1'
        }
      }
    }]
};

describe('tryEach', function() {
  beforeEach(function() {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
    mockery.enable({
      warnOnUnregistered: false,
      useCleanCache: true
    });
    require('chalk').enabled = false;
  });

  afterEach(function() {
    mockery.deregisterAll();
    mockery.disable();
    process.chdir(root);
    return remove(tmproot);
  });

  describe('with legacy config', function() {
    it('succeeds when scenario\'s tests succeed', function() {
      this.timeout(30000);

      var mockedRun = generateMockRun('ember test', function() {
        return RSVP.resolve(0);
      });
      mockery.registerMock('./run', mockedRun);

      var output = [];
      var outputFn = function(log) {
        output.push(log);
      };

      var mockedExit = function(code) {
        expect(code).to.equal(0, 'exits 0 when all scenarios succeed');
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: legacyConfig,
        _on: function() {},
        _exit: mockedExit
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(legacyConfig.scenarios, {}).then(function() {
        expect(output).to.include('Scenario default: SUCCESS');
        expect(output).to.include('Scenario first: SUCCESS');
        expect(output).to.include('Scenario second: SUCCESS');
        expect(output).to.include('Scenario with-dev-deps: SUCCESS');
        expect(output).to.include('Scenario with-resolutions: SUCCESS');

        expect(output).to.include('All 5 scenarios succeeded');
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Assertions should run');
      });
    });


    it('fails scenarios when scenario\'s tests fail', function() {
      this.timeout(30000);

      var runTestCount = 0;
      var mockedRun = generateMockRun('ember test', function() {
        runTestCount++;
        if (runTestCount === 1) {
          return RSVP.reject(1);
        } else {
          return RSVP.resolve(0);
        }
      });

      mockery.registerMock('./run', mockedRun);

      var output = [];
      var outputFn = function(log) {
        output.push(log);
      };

      var mockedExit = function(code) {
        expect(code).to.equal(1);
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: legacyConfig,
        _on: function() {},
        _exit: mockedExit
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(legacyConfig.scenarios, {}).then(function() {
        expect(output).to.include('Scenario default: FAIL');
        expect(output).to.include('Scenario first: SUCCESS');
        expect(output).to.include('Scenario second: SUCCESS');
        expect(output).to.include('Scenario with-dev-deps: SUCCESS');
        expect(output).to.include('Scenario with-resolutions: SUCCESS');
        expect(output).to.include('1 scenarios failed');
        expect(output).to.include('4 scenarios succeeded');
        expect(output).to.include('5 scenarios run');
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Assertions should run');
      });
    });

  });
  describe('with both npm and bower', function() {
    it('succeeds when scenario\'s tests succeed', function() {
      this.timeout(300000);

      var mockedRun = generateMockRun('ember test', function() {
        return RSVP.resolve(0);
      });

      mockery.registerMock('./run', mockedRun);

      var output = [];
      var outputFn = function(log) {
        output.push(log);
      };

      var mockedExit = function(code) {
        expect(code).to.equal(0, 'exits 0 when all scenarios succeed');
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: config,
        _on: function() {},
        _exit: mockedExit
      });

      writeJSONFile('package.json', fixturePackage);
      fs.mkdirSync('node_modules');
      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then(function() {
        expect(output).to.include('Scenario first: SUCCESS');
        expect(output).to.include('Scenario second: SUCCESS');
        expect(output).to.include('Scenario with-bower-resolutions: SUCCESS');
        expect(output).to.include('All 3 scenarios succeeded');
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Assertions should run');
      });
    });


    it('fails scenarios when scenario\'s tests fail', function() {
      this.timeout(300000);

      var runTestCount = 0;
      var mockedRun = generateMockRun('ember test', function() {
        runTestCount++;
        if (runTestCount === 1) {
          return RSVP.reject(1);
        } else {
          return RSVP.resolve(0);
        }
      });

      mockery.registerMock('./run', mockedRun);

      var output = [];
      var outputFn = function(log) {
        output.push(log);
      };

      var mockedExit = function(code) {
        expect(code).to.equal(1);
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: config,
        _on: function() {},
        _exit: mockedExit
      });

      writeJSONFile('package.json', fixturePackage);
      fs.mkdirSync('node_modules');
      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then(function() {
        expect(output).to.include('Scenario first: FAIL');
        expect(output).to.include('Scenario second: SUCCESS');
        expect(output).to.include('Scenario with-bower-resolutions: SUCCESS');
        expect(output).to.include('1 scenarios failed');
        expect(output).to.include('2 scenarios succeeded');
        expect(output).to.include('3 scenarios run');
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Assertions should run');
      });
    });

  });

  describe('with stubbed dependency manager', function() {
    it('passes along timeout options to run', function() {
      // With stubbed dependency manager, timing out is warning for accidentally not using the stub
      this.timeout(200);

      var config = {
        scenarios: [{
          name: 'first',
          dependencies: {
            ember: '1.13.0'
          }
        }]
      };
      var passedInOptions = false;
      var mockedRun = generateMockRun('ember serve', function(command, args, options) {
        if (options.timeout && options.timeout.length === 20000 && options.timeout.isSuccess) {
          passedInOptions = true;
        }
        return RSVP.resolve(0);
      });

      mockery.registerMock('./run', mockedRun);

      var output = [];
      var outputFn = function(log) {
        output.push(log);
      };

      var mockedExit = function(code) {
        expect(code).to.equal(0, 'exits 0 when all scenarios succeed');
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: config,
        commandArgs: ['ember', 'serve'],
        commandOptions: { timeout: { length: 20000, isSuccess: true }},
        dependencyManagerAdapters: [new StubDependencyAdapter()],
        _on: function() {},
        _exit: mockedExit
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then(function() {
        expect(output).to.include('Scenario first: SUCCESS');
        expect(passedInOptions).to.equal(true, 'Should pass the options all the way down to run');
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Assertions should run');
      });
    });

    describe('allowedToFail', function() {
      it('exits appropriately if all failures were allowedToFail', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(200);

        var config = {
          scenarios: [{
            name: 'first',
            allowedToFail: true,
            dependencies: {
              ember: '1.13.0'
            }
          },{
            name: 'second',
            allowedToFail: true,
            dependencies: {
              ember: '2.2.0'
            }
          }]
        };

        var mockedRun = generateMockRun('ember test', function() {
          return RSVP.reject(1);
        });
        mockery.registerMock('./run', mockedRun);

        var output = [];
        var outputFn = function(log) {
          output.push(log);
        };
        var exitCode;
        var mockedExit = function(code) {
          exitCode = code;
        };

        var TryEachTask = require('../../lib/tasks/try-each');
        var tryEachTask = new TryEachTask({
          ui: {writeLine: outputFn},
          project: {root: tmpdir},
          config: config,
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on: function() {},
          _exit: mockedExit
        });

        return tryEachTask.run(config.scenarios, {}).then(function() {
          expect(output).to.include('Scenario first: FAIL (Allowed)');
          expect(output).to.include('Scenario second: FAIL (Allowed)');
          expect(output).to.include('2 scenarios failed (2 allowed)');
          expect(exitCode).to.equal(0, 'exits 0 when all failures were allowed');
        }).catch(function(err) {
          console.log(err);
          expect(true).to.equal(false, 'Assertions should run');
        });
      });

      it('exits appropriately if any failures were not allowedToFail', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(200);

        var config = {
          scenarios: [{
            name: 'first',
            dependencies: {
              ember: '1.13.0'
            }
          },{
            name: 'second',
            allowedToFail: true,
            dependencies: {
              ember: '2.2.0'
            }
          }]
        };

        var mockedRun = generateMockRun('ember test', function() {
          return RSVP.reject(1);
        });
        mockery.registerMock('./run', mockedRun);

        var output = [];
        var outputFn = function(log) {
          output.push(log);
        };
        var exitCode;
        var mockedExit = function(code) {
          exitCode = code;
        };

        var TryEachTask = require('../../lib/tasks/try-each');
        var tryEachTask = new TryEachTask({
          ui: {writeLine: outputFn},
          project: {root: tmpdir},
          config: config,
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on: function() {},
          _exit: mockedExit
        });

        return tryEachTask.run(config.scenarios, {}).then(function() {
          expect(output).to.include('Scenario first: FAIL');
          expect(output).to.include('Scenario second: FAIL (Allowed)');
          expect(output).to.include('2 scenarios failed (1 allowed)');
          expect(exitCode).to.equal(1, 'exits 1 when any failures were NOT allowed');
        }).catch(function(err) {
          console.log(err);
          expect(true).to.equal(false, 'Assertions should run');
        });
      });

      it('exits appropriately if all allowedToFail pass', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(200);

        var config = {
          scenarios: [{
            name: 'first',
            allowedToFail: true,
            dependencies: {
              ember: '1.13.0'
            }
          },{
            name: 'second',
            allowedToFail: true,
            dependencies: {
              ember: '2.2.0'
            }
          }]
        };

        var mockedRun = generateMockRun('ember test', function() {
          return RSVP.resolve(0);
        });
        mockery.registerMock('./run', mockedRun);

        var output = [];
        var outputFn = function(log) {
          output.push(log);
        };
        var exitCode;
        var mockedExit = function(code) {
          exitCode = code;
        };

        var TryEachTask = require('../../lib/tasks/try-each');
        var tryEachTask = new TryEachTask({
          ui: {writeLine: outputFn},
          project: {root: tmpdir},
          config: config,
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on: function() {},
          _exit: mockedExit
        });

        return tryEachTask.run(config.scenarios, {}).then(function() {
          expect(output).to.include('Scenario first: SUCCESS');
          expect(output).to.include('Scenario second: SUCCESS');
          expect(output).to.include('All 2 scenarios succeeded');
          expect(exitCode).to.equal(0, 'exits 0 when all pass');
        }).catch(function(err) {
          console.log(err);
          expect(true).to.equal(false, 'Assertions should run');
        });
      });

    });

    describe('configurable command', function() {
      it('defaults to `ember test`', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(200);

        var config = {
          scenarios: [{
            name: 'first',
            dependencies: {
              ember: '1.13.0'
            }
          },{
            name: 'second',
            dependencies: {
              ember: '2.2.0'
            }
          }]
        };

        var ranDefaultCommand = false;

        var mockedRun = generateMockRun('ember test', function() {
          ranDefaultCommand = true;
          return RSVP.resolve(0);
        });

        mockery.registerMock('./run', mockedRun);

        var output = [];
        var outputFn = function(log) {
          output.push(log);
        };

        var mockedExit = function(code) {
          expect(code).to.equal(0, 'exits 0 when all scenarios succeed');
        };

        var TryEachTask = require('../../lib/tasks/try-each');
        var tryEachTask = new TryEachTask({
          ui: {writeLine: outputFn},
          project: {root: tmpdir},
          config: config,
          commandArgs: [],
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on: function() {},
          _exit: mockedExit
        });

        return tryEachTask.run(config.scenarios, {}).then(function() {
          expect(output).to.include('Scenario first: SUCCESS');
          expect(output).to.include('Scenario second: SUCCESS');

          expect(ranDefaultCommand).to.equal(true, 'Should run the default command');
        }).catch(function() {
          expect(true).to.equal(false, 'Assertions should run');
        });
      });

      it('allows passing in of the command to run', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(200);

        var config = {
          command: 'ember test-this',
          scenarios: [{
            name: 'first',
            dependencies: {
              ember: '1.13.0'
            }
          }]
        };
        var ranPassedInCommand = false;
        var mockedRun = generateMockRun('ember serve', function() {
          ranPassedInCommand = true;
          return RSVP.resolve(0);
        });
        mockery.registerMock('./run', mockedRun);

        var output = [];
        var outputFn = function(log) {
          output.push(log);
        };

        var mockedExit = function(code) {
          expect(code).to.equal(0, 'exits 0 when all scenarios succeed');
        };

        var TryEachTask = require('../../lib/tasks/try-each');
        var tryEachTask = new TryEachTask({
          ui: {writeLine: outputFn},
          project: {root: tmpdir},
          config: config,
          commandArgs: ['ember', 'serve'],
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on: function() {},
          _exit: mockedExit
        });

        return tryEachTask.run(config.scenarios, {}).then(function() {
          expect(output).to.include('Scenario first: SUCCESS');
          expect(ranPassedInCommand).to.equal(true, 'Should run the passed in command');
        }).catch(function(err) {
          console.log(err);
          expect(true).to.equal(false, 'Assertions should run');
        });
      });

      it('uses command from config', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(200);

        var config = {
          command: 'ember test --test-port=2345',
          scenarios: [{
            name: 'first',
            dependencies: {
              ember: '1.13.0'
            }
          },{
            name: 'second',
            dependencies: {
              ember: '2.2.0'
            }
          },{
            name: 'different',
            command: 'npm run-script different',
            dependencies: {
              ember: '2.0.0'
            }
          }]
        };

        var ranDefaultCommandCount = 0;
        var ranScenarioCommandCount = 0;
        var mockedRun = generateMockRun([{
          command: 'ember test --test-port=2345',
          callback: function() {
            ranDefaultCommandCount++;
            return RSVP.resolve(0);
          }
        },{
          command: 'npm run-script different',
          callback: function() {
            ranScenarioCommandCount++;
            return RSVP.resolve(0);
          }
        }]);
        mockery.registerMock('./run', mockedRun);

        var output = [];
        var outputFn = function(log) {
          output.push(log);
        };

        var mockedExit = function(code) {
          expect(code).to.equal(0, 'exits 0 when all scenarios succeed');
        };

        var TryEachTask = require('../../lib/tasks/try-each');
        var tryEachTask = new TryEachTask({
          ui: {writeLine: outputFn},
          project: {root: tmpdir},
          config: config,
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on: function() {},
          _exit: mockedExit
        });

        return tryEachTask.run(config.scenarios, {}).then(function() {
          expect(output).to.include('Scenario first: SUCCESS');
          expect(output).to.include('Scenario second: SUCCESS');
          expect(output).to.include('Scenario different: SUCCESS');

          expect(ranDefaultCommandCount).to.equal(2, 'Should run the default command scenarios without their own commands specified');
          expect(ranScenarioCommandCount).to.equal(1, 'Should run the scenario command for scenario that specified it');
        }).catch(function(err) {
          console.log(err);
          expect(true).to.equal(false, 'Assertions should run');
        });
      });

      it('allows passing options to the command run', function() {
        // With stubbed dependency manager, timing out is warning for accidentally not using the stub
        this.timeout(10000);

        var config = {
          scenarios: [{
            name: 'first',
            dependencies: {
              ember: '1.13.0'
            }
          }]
        };

        var output = [];
        var outputFn = function(log) {
          output.push(log);
        };

        var mockedExit = function(code) {
          expect(code).to.equal(0, 'exits 0 when all scenarios succeed');
        };

        var TryEachTask = require('../../lib/tasks/try-each');
        var tryEachTask = new TryEachTask({
          ui: {writeLine: outputFn},
          project: {root: tmpdir},
          config: config,
          commandArgs: ['ember', 'help', '--json', 'true'],
          dependencyManagerAdapters: [new StubDependencyAdapter()],
          _on: function() {},
          _exit: mockedExit
        });

        return tryEachTask.run(config.scenarios, {}).then(function() {
          expect(output).to.include('Scenario first: SUCCESS', 'Passing scenario means options were passed along');
        }).catch(function(err) {
          console.log(err);
          expect(true).to.equal(false, 'Assertions should run');
        });
      });
    });

    it('sets EMBER_TRY_CURRENT_SCENARIO', function() {
      // With stubbed dependency manager, timing out is warning for accidentally not using the stub
      this.timeout(200);

      var config = {
        scenarios: [{
          name: 'first',
          dependencies: {
            ember: '1.13.0'
          }
        }]
      };

      var output = [];
      var outputFn = function(log) {
        output.push(log);
      };

      var mockedExit = function(code) {
        expect(code).to.equal(0, 'exits 0 when all scenarios succeed');
      };

      var scenarios = [];
      var mockRunCommand = function() {
        var currentScenario = process.env.EMBER_TRY_CURRENT_SCENARIO;
        scenarios.push(currentScenario);
        return RSVP.resolve(true);
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: config,
        dependencyManagerAdapters: [new StubDependencyAdapter()],
        _on: function() {},
        _exit: mockedExit,
        _runCommand: mockRunCommand
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then(function() {
        expect(scenarios).to.eql(['first']);
        var currentScenarioIsUndefined = process.env.EMBER_TRY_CURRENT_SCENARIO === undefined;
        expect(currentScenarioIsUndefined).to.equal(true);
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Assertions should run');
      });
    });
  });

});
