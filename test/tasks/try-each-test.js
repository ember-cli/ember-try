var tmp           = require('tmp-sync');
var path          = require('path');
var RSVP          = require('rsvp');
var fs            = require('fs-extra');
var fixtureBower  = require('../fixtures/bower.json');
var fixturePackage  = require('../fixtures/package.json');
var writeJSONFile = require('../helpers/write-json-file');
var mockery       = require('mockery');

/* The first two of the tests in this file intentionally DO NOT stub dependency manager adapter*/
var StubDependencyAdapter = require('../helpers/stub-dependency-manager-adapter');

var remove = RSVP.denodeify(fs.remove);
var root = process.cwd();
var tmproot = path.join(root, 'tmp');
var tmpdir;
var legacyConfig = {
  scenarios: [{
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
  }]
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
  },{
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

      var mockedRun = function(_, args) {
        if (args[1].indexOf('test') > -1) {
          return RSVP.resolve(0);
        } else {
          var regularRun = require('../../lib/utils/run');
          return regularRun.apply(this, arguments);
        }
      };

      mockery.registerMock('./run', mockedRun);

      var output = [];
      var outputFn = function(log) {
        output.push(log);
      };

      var mockedExit = function(code) {
        code.should.equal(0, 'exits 0 when all scenarios succeed');
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: legacyConfig,
        _exit: mockedExit
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(legacyConfig.scenarios, {}).then(function() {
        output.should.containEql('Scenario default: SUCCESS');
        output.should.containEql('Scenario first: SUCCESS');
        output.should.containEql('Scenario second: SUCCESS');
        output.should.containEql('Scenario with-dev-deps: SUCCESS');
        output.should.containEql('Scenario with-resolutions: SUCCESS');

        output.should.containEql('All 5 scenarios succeeded');
      }).catch(function(err) {
        console.log(err);
        true.should.equal(false, 'Assertions should run');
      });
    });


    it('fails scenarios when scenario\'s tests fail', function() {
      this.timeout(30000);

      var runTestCount = 0;
      var mockedRun = function(_, args) {
        if (args[1].indexOf('test') > -1) {
          runTestCount++;
          if (runTestCount == 1) {
            return RSVP.reject(1);
          } else {
            return RSVP.resolve(0);
          }
        } else {
          var regularRun = require('../../lib/utils/run');
          return regularRun.apply(this, arguments);
        }
      };

      mockery.registerMock('./run', mockedRun);

      var output = [];
      var outputFn = function(log) {
        output.push(log);
      };

      var mockedExit = function(code) {
        code.should.equal(1);
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: legacyConfig,
        _exit: mockedExit
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(legacyConfig.scenarios, {}).then(function() {
        output.should.containEql('Scenario default: FAIL');
        output.should.containEql('Scenario first: SUCCESS');
        output.should.containEql('Scenario second: SUCCESS');
        output.should.containEql('Scenario with-dev-deps: SUCCESS');
        output.should.containEql('Scenario with-resolutions: SUCCESS');
        output.should.containEql('1 scenarios failed');
        output.should.containEql('4 scenarios succeeded');
        output.should.containEql('5 scenarios run');
      }).catch(function(err) {
        console.log(err);
        true.should.equal(false, 'Assertions should run');
      });
    });

  });
  describe('with both npm and bower', function() {
    it('succeeds when scenario\'s tests succeed', function() {
      this.timeout(300000);

      var mockedRun = function(cmd, args, opts) {
        if (args && args.length > 1 && args[1].indexOf('test') > -1) {
          return RSVP.resolve(0);
        } else {
          var regularRun = require('../../lib/utils/run');
          return regularRun.apply(this, arguments);
        }
      };

      mockery.registerMock('./run', mockedRun);

      var output = [];
      var outputFn = function(log) {
        output.push(log);
      };

      var mockedExit = function(code) {
        code.should.equal(0, 'exits 0 when all scenarios succeed');
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: config,
        _exit: mockedExit
      });

      writeJSONFile('package.json', fixturePackage);
      fs.mkdirSync('node_modules');
      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then(function() {
        output.should.containEql('Scenario first: SUCCESS');
        output.should.containEql('Scenario second: SUCCESS');
        output.should.containEql('Scenario with-bower-resolutions: SUCCESS');
        output.should.containEql('All 3 scenarios succeeded');
      }).catch(function(err) {
        console.log(err);
        true.should.equal(false, 'Assertions should run');
      });
    });


    it('fails scenarios when scenario\'s tests fail', function() {
      this.timeout(300000);

      var runTestCount = 0;
      var mockedRun = function(_, args) {
        if (args && args.length > 1 && args[1].indexOf('test') > -1) {
          runTestCount++;
          if (runTestCount == 1) {
            return RSVP.reject(1);
          } else {
            return RSVP.resolve(0);
          }
        } else {
          var regularRun = require('../../lib/utils/run');
          return regularRun.apply(this, arguments);
        }
      };

      mockery.registerMock('./run', mockedRun);

      var output = [];
      var outputFn = function(log) {
        output.push(log);
      };

      var mockedExit = function(code) {
        code.should.equal(1);
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: config,
        _exit: mockedExit
      });

      writeJSONFile('package.json', fixturePackage);
      fs.mkdirSync('node_modules');
      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then(function() {
        output.should.containEql('Scenario first: FAIL');
        output.should.containEql('Scenario second: SUCCESS');
        output.should.containEql('Scenario with-bower-resolutions: SUCCESS');
        output.should.containEql('1 scenarios failed');
        output.should.containEql('2 scenarios succeeded');
        output.should.containEql('3 scenarios run');
      }).catch(function(err) {
        console.log(err);
        true.should.equal(false, 'Assertions should run');
      });
    });

  });

  describe('with stubbed dependency manager', function() {
    it('passes along timeout options to run', function() {
      // With stubbed dependency manager, timing out is warning for accidentally not using the stub
      this.timeout(100);

      var config = {
        scenarios: [{
          name: 'first',
          dependencies: {
            ember: '1.13.0'
          }
        }]
      };
      var passedInOptions = false;
      var mockedRun = function(_, args, options) {
        if (args[1].indexOf('serve') > -1) {
          if(options.timeout && options.timeout.length == 20000 && options.timeout.isSuccess) {
            passedInOptions = true;
          }
          return RSVP.resolve(0);
        } else {
          var regularRun = require('../../lib/utils/run');
          return regularRun.apply(this, arguments);
        }
      };

      mockery.registerMock('./run', mockedRun);

      var output = [];
      var outputFn = function(log) {
        output.push(log);
      };

      var mockedExit = function(code) {
        code.should.equal(0, 'exits 0 when all scenarios succeed');
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: config,
        commandArgs: ['serve'],
        commandOptions: { timeout: { length: 20000, isSuccess: true }},
        dependencyManagerAdapters: [new StubDependencyAdapter()],
        _exit: mockedExit
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then(function() {
        output.should.containEql('Scenario first: SUCCESS');
        passedInOptions.should.equal(true, 'Should pass the options all the way down to run');
      }).catch(function(err) {
        console.log(err);
        true.should.equal(false, 'Assertions should run');
      });
    });

    it('allows passing in of the command to run', function() {
      // With stubbed dependency manager, timing out is warning for accidentally not using the stub
      this.timeout(100);

      var config = {
        scenarios: [{
          name: 'first',
          dependencies: {
            ember: '1.13.0'
          }
        }]
      };
      var ranPassedInCommand = false;
      var mockedRun = function(_, args) {
        if (args[1].indexOf('serve') > -1) {
          ranPassedInCommand = true;
          return RSVP.resolve(0);
        } else {
          var regularRun = require('../../lib/utils/run');
          return regularRun.apply(this, arguments);
        }
      };

      mockery.registerMock('./run', mockedRun);

      var output = [];
      var outputFn = function(log) {
        output.push(log);
      };

      var mockedExit = function(code) {
        code.should.equal(0, 'exits 0 when all scenarios succeed');
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: config,
        commandArgs: ['serve'],
        dependencyManagerAdapters: [new StubDependencyAdapter()],
        _exit: mockedExit
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then(function() {
        output.should.containEql('Scenario first: SUCCESS');
        ranPassedInCommand.should.equal(true, 'Should run the passed in command');
      }).catch(function(err) {
        console.log(err);
        true.should.equal(false, 'Assertions should run');
      });
    });

    it('allows passing options to the command run', function() {
      // With stubbed dependency manager, timing out is warning for accidentally not using the stub
      this.timeout(5000);

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
        code.should.equal(0, 'exits 0 when all scenarios succeed');
      };

      var TryEachTask = require('../../lib/tasks/try-each');
      var tryEachTask = new TryEachTask({
        ui: {writeLine: outputFn},
        project: {root: tmpdir},
        config: config,
        commandArgs: ['help', '--json', 'true'],
        dependencyManagerAdapters: [new StubDependencyAdapter()],
        _exit: mockedExit
      });

      return tryEachTask.run(config.scenarios, {}).then(function() {
        output.should.containEql('Scenario first: SUCCESS', 'Passing scenario means options were passed along');
      }).catch(function(err) {
        console.log(err);
        true.should.equal(false, 'Assertions should run');
      });
    });

    it('sets EMBER_TRY_CURRENT_SCENARIO', function() {
      // With stubbed dependency manager, timing out is warning for accidentally not using the stub
      this.timeout(100);

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
        code.should.equal(0, 'exits 0 when all scenarios succeed');
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
        commandArgs: ['serve'],
        dependencyManagerAdapters: [new StubDependencyAdapter()],
        _exit: mockedExit,
        _runCommand: mockRunCommand
      });

      writeJSONFile('bower.json', fixtureBower);
      return tryEachTask.run(config.scenarios, {}).then(function() {
        scenarios.should.eql(['first']);
        var currentScenarioIsUndefined = process.env.EMBER_TRY_CURRENT_SCENARIO === undefined;
        currentScenarioIsUndefined.should.equal(true);
      }).catch(function(err) {
        console.log(err);
        true.should.equal(false, 'Assertions should run');
      });
    });
  });

});
