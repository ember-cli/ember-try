'use strict';

const fs = require('fs-extra');

module.exports = function writeJSONFile(filename, contents) {
  fs.writeFileSync(filename, JSON.stringify(contents, null, 2));
};
