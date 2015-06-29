/* jshint node: true */
var fs   = require('fs');

var RSVP = require('rsvp');
var spawn = require('child_process').spawn;

function run(command, args, opts, stdout) {
  opts = opts || {};
  if (typeof stdout == 'undefined') {
    opts.stdio = 'inherit';
  } else {
    opts.stdio = [process.stdin, fs.openSync(stdout, 'w'), process.stderr];
  }
  return new RSVP.Promise(function(resolve, reject) {
    var p = spawn(command, args, opts);
    p.on('close', function(code){
      if (code !== 0) {
        reject(command + " exited with nonzero status");
      } else {
        resolve();
      }
    });
  });
}

module.exports = run;
