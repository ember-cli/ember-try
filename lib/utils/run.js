'use strict';

const execa = require('execa');
const debug = require('debug')('ember-try:utils:run');

module.exports = async function run(command, args, _options) {
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
};
