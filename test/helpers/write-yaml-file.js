'use strict';

var fs = require('fs-extra');
var yaml = require('js-yaml');

module.exports = function writeJSONFile(filename, contents) {
  fs.writeFileSync(filename, yaml.dump(contents));
};
