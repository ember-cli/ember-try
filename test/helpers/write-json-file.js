'use strict';

var fs = require('fs-extra');

module.exports = function writeJSONFile(filename, contents) {
  fs.writeFileSync(filename, JSON.stringify(contents, null, 2));
};
