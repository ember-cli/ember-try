var tmp           = require('tmp-sync');
var path          = require('path');
var RSVP          = require('rsvp');
var fs            = require('fs-extra');
var fixtureBower  = require('../fixtures/bower.json');
var writeJSONFile = require('../helpers/write-json-file');
var mockery       = require('mockery');

var remove = RSVP.denodeify(fs.remove);
var root = process.cwd();
var tmproot = path.join(root, 'tmp');
var tmpdir;

describe('try', function() {
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

  it('succeeds scenarios when the command succeeds for that scenario', function() {
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
        return RSVP.resolve();
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
      code.should.equal(0, 'Should exit 0 when command succeeds');
    };

    var TryTask = require('../../lib/tasks/try');
    var tryTask = new TryTask({
      ui: {writeLine: outputFn},
      project: {root: tmpdir},
      config: config,
      _exit: mockedExit
    });

    writeJSONFile('bower.json', fixtureBower);
    return tryTask.run(config.scenarios[0], ['test'], {}).then(function() {
      output.should.containEql('Scenario first: SUCCESS');
      output.should.containEql('All 1 scenarios succeeded');
    }).catch(function(err) {
      console.log(err);
      true.should.equal(false, 'Assertions should run');
    });
  });

  it('fails scenarios when the command fails for that scenario', function() {
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
        return RSVP.reject(1);
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

    var TryTask = require('../../lib/tasks/try');
    var tryTask = new TryTask({
      ui: {writeLine: outputFn},
      project: {root: tmpdir},
      config: config,
      _exit: mockedExit
    });

    writeJSONFile('bower.json', fixtureBower);
    return tryTask.run(config.scenarios[0], ['test'], {}).then(function() {
      output.should.containEql('Scenario first : FAIL');
      output.should.containEql('1 scenarios failed');
      output.should.containEql('0 scenarios succeeded');
      output.should.containEql('1 scenarios run');
    }).catch(function(err) {
      console.log(err);
      true.should.equal(false, 'Assertions should run');
    });
  });

});
