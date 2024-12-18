import { expect } from 'chai';
import fs from 'fs-extra';
import path from 'path';

export default function assertFileContainsJSON(filePath, expectedObj) {
  return assertFileContains(filePath, JSON.stringify(expectedObj, null, 2));
}

function assertFileContains(filePath, expectedContents) {
  let regex = new RegExp(`${escapeForRegex(expectedContents)}($|\\W)`, 'gm');
  let actualContents = fs.readFileSync(filePath, { encoding: 'utf-8' });
  let result = regex.test(actualContents);
  expect(result).to.equal(
    true,
    `File ${path.basename(filePath)} is expected to contain ${expectedContents}`,
  );
}

function escapeForRegex(str) {
  return str.replace(/[-[\]{}()*+?.,\\^$|#]/g, '\\$&');
}
