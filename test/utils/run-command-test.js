'use strict';

let expect = require('chai').expect;
let mockery = require('mockery');
let RSVP = require('rsvp');

describe('utils/run-command', () => {
  beforeEach(() => {
    mockery.enable({
      warnOnUnregistered: false,
      useCleanCache: true,
    });
  });

  afterEach(() => {
    mockery.deregisterAll();
    mockery.disable();
  });

  it('passes arguments to run', () => {
    let mockedRun = function(command, args) {
      expect(command).to.equal('node');
      expect(args[0]).to.match(/.*\/ember/);
      expect(args[1]).to.equal('help');
      expect(args[2]).to.equal('--json');
      expect(args[3]).to.equal('true');
      return RSVP.resolve(0);
    };

    mockery.registerMock('./run', mockedRun);

    let runCommand = require('../../lib/utils/run-command');

    return runCommand('rootPath', ['ember', 'help', '--json', 'true'], {}).then((result) => {
      expect(result).to.equal(true);
    });
  });
});
