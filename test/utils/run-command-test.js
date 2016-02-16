var should      = require('should');
var mockery     = require('mockery');
var RSVP        = require('rsvp');

describe('utils/run-command', function() {
  beforeEach(function() {
    mockery.enable({
      warnOnUnregistered: false,
      useCleanCache: true
    });
  });

  afterEach(function() {
    mockery.deregisterAll();
    mockery.disable();
  });

  it('passes arguments to run', function() {
    var mockedRun = function(command, args) {
      command.should.equal('node');
      args[0].should.match(/.*\/ember/);
      args[1].should.equal('help');
      args[2].should.equal('--json');
      args[3].should.equal('true');
      return RSVP.resolve(0);
    };

    mockery.registerMock('./run', mockedRun);

    var runCommand  = require('../../lib/utils/run-command');

    return runCommand('rootPath', ['help', '--json', 'true'], {}).then(function(result){
      result.should.equal(true);
    });
  });
});
