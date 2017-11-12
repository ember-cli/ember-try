'use strict';

var RSVP = require('rsvp');
var spawn = require('child_process').spawn;
var debug = require('debug')('ember-try:utils:run');

function run(command, args, opts) {
  opts = opts || {};

  opts.stdio = opts.stdio || 'inherit';

  if (process.env.SHUT_UP) {
    opts.stdio = 'ignore';
  }

  var sh = 'sh';
  var shFlag = '-c';

  if (process.platform === 'win32') {
    sh = process.env.comspec || 'cmd';
    shFlag = '/d /s /c';
    opts.windowsVerbatimArguments = true;
  }

  return new RSVP.Promise(function(resolve, reject) {
    var cmdArgs = command + ' ' + args.join(' ');
    var p = spawn(sh, [shFlag, cmdArgs], opts);
    debug('spawned with ', sh, [shFlag, cmdArgs], opts);
    var didTimeout = false;
    if (opts.timeout) {
      setTimeout(function() {
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

    p.on('close', function(code) {
      if (!didTimeout) {

        debug('Process exited %s', code);

        if (code !== 0) {
          reject(code);
        } else {
          resolve();
        }
      }
    });
  });
}

module.exports = run;
