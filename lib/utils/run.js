'use strict';

let RSVP = require('rsvp');
let spawn = require('child_process').spawn;
let debug = require('debug')('ember-try:utils:run');

function run(command, args, opts) {
  opts = opts || {};
  opts.stdio = 'inherit';

  if (process.env.SHUT_UP) {
    opts.stdio = 'ignore';
  }

  let sh = 'sh';
  let shFlag = '-c';

  if (process.platform === 'win32') {
    sh = process.env.comspec || 'cmd';
    shFlag = '/d /s /c';
    opts.windowsVerbatimArguments = true;
  }

  return new RSVP.Promise(((resolve, reject) => {
    let cmdArgs = `${command} ${args.join(' ')}`;
    let p = spawn(sh, [shFlag, cmdArgs], opts);
    debug('spawned with ', sh, [shFlag, cmdArgs], opts);
    let didTimeout = false;
    if (opts.timeout) {
      setTimeout(() => {
        didTimeout = true;
        p.kill();
        debug('Killed process due to timeout of %s', opts.timeout.length || 1000);
        if (opts.timeout.isSuccess) {
          debug('Timeout was success');
          resolve();
        } else {
          debug('Timeout was failure');
          reject(1);
        }
      }, opts.timeout.length || 1000);
    }

    p.on('close', (code) => {
      if (!didTimeout) {

        debug('Process exited %s', code);

        if (code !== 0) {
          reject(code);
        } else {
          resolve();
        }
      }
    });
  }));
}

module.exports = run;
