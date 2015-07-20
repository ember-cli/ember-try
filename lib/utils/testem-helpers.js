var path   = require('path');
var fs     = require('fs-extra');
var RSVP   = require('rsvp');
var rimraf = RSVP.denodeify(require('rimraf'));

module.exports = {
  resetTestemFile: function(root){
    var copy = RSVP.denodeify(fs.copy);
    return copy('testem.json.ember-try', 'testem.json', {cwd: root});
  },
  backupTestemFile: function(root){
    var copy = RSVP.denodeify(fs.copy);
    return copy('testem.json', 'testem.json.ember-try', {cwd: root});
  },
  cleanup: function(root){
    var helpers = this;
    return helpers.resetTestemFile(root).then(function(){
      return rimraf(path.join(root, 'testem.json.ember-try'));
    })
    .catch(function(){});
  }
};
