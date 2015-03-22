function verifyCanProceed(options){
  var exec = require('sync-exec');
  var results = exec('git ls-files -m', {cwd: options.project.root}).stdout;
  var regex = /bower\.json/;
  if(regex.test(results)){
    throw new Error("bower.json is dirty. ember-try uses `git checkout` to reset. Please commit changes then try again.");
  }
}

module.exports = verifyCanProceed;
