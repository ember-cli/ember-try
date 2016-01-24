var tmp           = require('tmp-sync');
var path          = require('path');
var RSVP          = require('rsvp');
var fs            = require('fs-extra');
var fixtureBower  = require('../fixtures/bower.json');
var writeJSONFile = require('../helpers/write-json-file');
var mockery       = require('mockery');

/* The first two of the tests in this file intentionally DO NOT stub dependency manager adapter*/
var StubDependencyAdapter = require('../helpers/stub-dependency-manager-adapter');

var remove = RSVP.denodeify(fs.remove);
var root = process.cwd();
var tmproot = path.join(root, 'tmp');
var tmpdir;

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

  it('succeeds scenario\'s tests succeed', function() {
    this.timeout(5000);

    var config = {
      scenarios: [{
        name: 'first',
        dependencies: {
          ember: '1.13.0'
        }
      },{
        name: 'second',
        dependencies: {
          ember: '2.0.0'
        }
      }]
    };

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
      config: config,
      _exit: mockedExit
    });

    writeJSONFile('bower.json', fixtureBower);
    return tryEachTask.run(config.scenarios, {}).then(function() {
      output.should.containEql('Scenario first: SUCCESS');
      output.should.containEql('Scenario second: SUCCESS');
      output.should.containEql('All 2 scenarios succeeded');
    }).catch(function(err) {
      console.log(err);
      true.should.equal(false, 'Assertions should run');
    });
  });


  it('fails scenarios when scenario\'s tests fail', function() {
    this.timeout(5000);

    var config = {
      scenarios: [{
        name: 'first',
        dependencies: {
          ember: '1.13.0'
        }
      },{
        name: 'second',
        dependencies: {
          ember: '2.0.0'
        }
      }]
    };
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
      config: config,
      _exit: mockedExit
    });

    writeJSONFile('bower.json', fixtureBower);
    return tryEachTask.run(config.scenarios, {}).then(function() {
      output.should.containEql('Scenario first : FAIL');
      output.should.containEql('Scenario second: SUCCESS');
      output.should.containEql('1 scenarios failed');
      output.should.containEql('1 scenarios succeeded');
      output.should.containEql('2 scenarios run');
    }).catch(function(err) {
      console.log(err);
      true.should.equal(false, 'Assertions should run');
    });
  });

  it('allows passing in of the command to run', function() {
    this.timeout(5000);

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
      dependencyManagerAdapter: new StubDependencyAdapter(),
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
});
