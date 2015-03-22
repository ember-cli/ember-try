var path   = require('path');
var fs     = require('fs');
var rimraf = require('rimraf');
var run    = require('./run');

module.exports = {
  install: function(root){
    rimraf.sync(path.join(root, 'bower_components'));
    return run('bower', ['install'], {cwd: root});
  },
  resetBowerFile: function(root){
    var bowerFile = path.join(root, 'bower.json');
    return run('git', ['checkout', bowerFile])
  },
  cleanup: function(root){
    var helpers = this;
    return helpers.resetBowerFile(root).then(function(){
      return helpers.install(root);
    });
  },
  findVersion: function(packageName, root){
    var filename = path.join(root, 'bower_components', packageName, 'bower.json');
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    }
  }
};
