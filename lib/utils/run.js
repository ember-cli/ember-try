var RSVP = require('rsvp');
var spawn = require('child_process').spawn;

function run(command, args, opts) {
  opts = opts || {};
  opts.stdio = 'inherit';

  if (process.env.SHUT_UP) {
    opts.stdio = 'ignore';
  }

  return new RSVP.Promise(function(resolve, reject) {
    var p = spawn(command, args, opts);
    var didTimeout = false;
    if (opts.timeout) {
      setTimeout(function() {
        didTimeout = true;
        p.kill();
        if (opts.timeout.isSuccess) {
          resolve();
        } else {
          reject(1);
        }
      }, opts.timeout.length || 1000);
    }

    p.on('close', function(code) {
      if (!didTimeout) {
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
