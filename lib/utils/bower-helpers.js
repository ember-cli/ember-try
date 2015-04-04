var path   = require('path');
var fs     = require('fs-extra');
var rimraf = require('rimraf');
var RSVP   = require('rsvp');
var run    = require('./run');

module.exports = {
  install: function(root){
    rimraf.sync(path.join(root, 'bower_components'));
    return run('bower', ['install'], {cwd: root});
  },
  resetBowerFile: function(root){
    var copy = RSVP.denodeify(fs.copy);
    return copy('bower.json.ember-try', 'bower.json', {cwd: root});
  },
  backupBowerFile: function(root){
    var copy = RSVP.denodeify(fs.copy);
    return copy('bower.json', 'bower.json.ember-try', {cwd: root});
  },
  cleanup: function(root){
    var helpers = this;
    return helpers.resetBowerFile(root).then(function(){
      rimraf.sync(path.join(root, 'bower.json.ember-try'));
    })
    .catch(function(){})
    .then(function(){
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
