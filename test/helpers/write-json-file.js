import fs from 'fs-extra';

export default function writeJSONFile(filename, contents) {
  fs.writeFileSync(filename, JSON.stringify(contents, null, 2));
}
