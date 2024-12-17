'use strict';

const expect = require('chai').expect;
const { _mockRun, _restoreRun } = require('../../lib/utils/run');

describe('utils/run-command', () => {
  afterEach(() => {
    _restoreRun();
  });

  it('passes arguments to run', () => {
    let mockedRun = function (command, args) {
      expect(command).to.equal('node');
      expect(args[0]).to.match(/.*\/ember/);
      expect(args[1]).to.equal('help');
      expect(args[2]).to.equal('--json');
      expect(args[3]).to.equal('true');
      return Promise.resolve(0);
    };

    _mockRun(mockedRun);

    let runCommand = require('../../lib/utils/run-command');

    return runCommand('rootPath', ['ember', 'help', '--json', 'true'], {}).then((result) => {
      expect(result).to.equal(true);
    });
  });
});
