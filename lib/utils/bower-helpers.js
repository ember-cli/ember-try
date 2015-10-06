var path   = require('path');
var fs     = require('fs-extra');
var RSVP   = require('rsvp');

module.exports = {
  findVersion: function(packageName, root) {
    var filename = path.join(root, 'bower_components', packageName, 'bower.json');
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    } else {
      throw 'File ' + filename + ' does not exist';
    }
  }
};
