'use strict';

let expect = require('chai').expect;
let fs = require('fs-extra');
let path = require('path');

module.exports = function assertFileContainsJSON(filePath, expectedObj) {
  return assertFileContains(filePath, JSON.stringify(expectedObj, null, 2));
};

function assertFileContains(filePath, expectedContents) {
  let regex = new RegExp(`${escapeForRegex(expectedContents)}($|\\W)`, 'gm');
  let actualContents = fs.readFileSync(filePath, { encoding: 'utf-8' });
  let result = regex.test(actualContents);
  expect(result).to.equal(true, `File ${path.basename(filePath)} is expected to contain ${expectedContents}`);
}

function escapeForRegex(str) {
  return str.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
}
