'use strict';

const execa = require('execa');
const debug = require('debug')('ember-try:utils:run');

module.exports = async function run(command, args, opts) {
  opts = opts || {};

  opts.stdio = opts.stdio || 'inherit';

  if (process.env.SHUT_UP) {
    opts.stdio = 'ignore';
  }

  let cmdArgs = `${command} ${args.join(' ')}`;
  try {
    debug('spawning execa.shell', cmdArgs, opts);

    return await execa.shell(cmdArgs, opts);
  } catch (error) {
    debug('error', error);

    // TODO: should refactor this to throw an error (easier to track down stack traces)
    throw error.code;
  }
};
