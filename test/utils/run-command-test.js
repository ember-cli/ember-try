import { expect } from 'chai';
import { _mockRun, _restoreRun } from '../../lib/utils/run.js';
import runCommand from '../../lib/utils/run-command.js';

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

    return runCommand('rootPath', ['ember', 'help', '--json', 'true'], {}).then((result) => {
      expect(result).to.equal(true);
    });
  });
});
