'use strict';

const execa = require('execa');
const debug = require('debug')('ember-try:utils:run');

let runFunction = originalRunFunction;

async function originalRunFunction(command, args, _options) {
  let options = Object.assign({ stdio: 'inherit', shell: true }, _options);

  if (process.env.SHUT_UP) {
    options.stdio = 'ignore';
  }

  let cmdArgs = `${command} ${args.join(' ')}`;
  try {
    debug('spawning execa.shell', cmdArgs, options);

    return await execa(cmdArgs, options);
  } catch (error) {
    debug('error', error);

    // TODO: should refactor this to throw an error (easier to track down stack traces)
    throw error.exitCode;
  }
}

function run(command, args, options) {
  return runFunction(command, args, options);
}

function mockRun(mockedRunFunction) {
  runFunction = mockedRunFunction;
}

function restoreRun() {
  runFunction = originalRunFunction;
}

module.exports = run;

module.exports._originalRunFunction = originalRunFunction;
module.exports._mockRun = mockRun;
module.exports._restoreRun = restoreRun;
