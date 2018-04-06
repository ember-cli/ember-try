'use strict';

let extend = require('extend');

module.exports = function generateMockRun() {
  let mockedRuns = [];
  let options = { allowPassthrough: true };
  if (typeof arguments[0] === 'string') {
    mockedRuns.push({ command: arguments[0], callback: arguments[1] });
  } else {
    mockedRuns = arguments[0];
    options = extend({}, options, arguments[1]);
  }

  return function mockRun(actualCommand, actualArgs, opts) {
    let matchingRuns = mockedRuns.filter((mockedRun) => {
      return isCommandMocked(mockedRun, actualCommand, actualArgs);
    });
    let matchingRun = matchingRuns[0];

    if (matchingRun) {
      return matchingRun.callback(actualCommand, actualArgs, opts);
    } else if (options.allowPassthrough) {
      return passthrough().apply(this, arguments);
    } else {
      throw new Error(`${actualCommand} ${actualArgs.join(' ')} not stubbed and not allowed to passthrough`);
    }
  };
};

function isCommandMocked(mockedRun, actualCommand, actualArgs) {
  let mockedRunParts = mockedRun.command.split(' ');
  let mockedCommand = mockedRunParts[0];
  let mockedArgs = mockedRunParts.slice(1);
  return mockedCommandIsEmberAndArgumentsMatch(mockedCommand, mockedArgs, actualCommand, actualArgs) ||
         commandIsMocked(mockedCommand, mockedArgs, actualCommand, actualArgs);
}

function passthrough() {
  return require('../../lib/utils/run');
}

function mockedCommandIsEmberAndArgumentsMatch(mockedCommand, mockedArgs, actualCommand, actualArgs) {

  return (mockedCommand === 'ember') &&
         (actualCommand === 'node' && actualArgs && (actualArgs[0].indexOf('ember') > -1) &&
         arraysAreEqual(actualArgs.slice(1), mockedArgs));
}

function commandIsMocked(mockedCommand, mockedArgs, actualCommand, actualArgs) {
  return mockedCommand === actualCommand &&
         arraysAreEqual(actualArgs, mockedArgs);
}

function arraysAreEqual(firstArr, secondArr) {
  if (firstArr.length !== secondArr.length) {
    return false;
  }

  for (let i = 0; i < secondArr.length; i++) {
    if (firstArr[i] !== secondArr[i]) {
      return false;
    }
  }

  return true;
}
