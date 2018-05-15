'use strict';

const execa = require('execa');
const debug = require('debug')('ember-try:utils:run');

module.exports = function run(command, args, opts) {
  opts = opts || {};

  opts.stdio = opts.stdio || 'inherit';

  if (process.env.SHUT_UP) {
    opts.stdio = 'ignore';
  }

  let cmdArgs = `${command} ${args.join(' ')}`;
  let child = execa.shell(cmdArgs, opts);

  debug('spawned with execa.shell', cmdArgs, opts);

  return child.then((child) => {
    if (child.code !== 0) {
      return Promise.reject(child.code);
    }
  });
};
