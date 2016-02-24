'use strict';

var expect      = require('chai').expect;
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
      expect(command).to.equal('node');
      expect(args[0]).to.match(/.*\/ember/);
      expect(args[1]).to.equal('help');
      expect(args[2]).to.equal('--json');
      expect(args[3]).to.equal('true');
      return RSVP.resolve(0);
    };

    mockery.registerMock('./run', mockedRun);

    var runCommand  = require('../../lib/utils/run-command');

    return runCommand('rootPath', ['ember', 'help', '--json', 'true'], {}).then(function(result) {
      expect(result).to.equal(true);
    });
  });
});
