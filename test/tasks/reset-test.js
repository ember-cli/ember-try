import tmp from 'tmp-sync';
import path from 'path';
import fs from 'fs-extra';
import writeJSONFile from '../helpers/write-json-file.js';
import ResetTask from '../../lib/tasks/reset.js';

const fixturePackageJson = fs.readJsonSync('./test/fixtures/package.json');

const root = process.cwd();
const tmproot = path.join(root, 'tmp');

describe('reset', () => {
  let tmpdir;
  beforeEach(() => {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
  });

  afterEach(() => {
    process.chdir(root);
    return fs.remove(tmproot);
  });

  it('runs without blowing up', function () {
    this.timeout(15000);
    let config = {
      scenarios: [
        {
          name: 'first',
          npm: {
            dependencies: {
              'ember-source': '2.13.0',
            },
          },
        },
      ],
    };

    let resetTask = new ResetTask({
      project: { root: tmpdir },
      config,
    });

    writeJSONFile('package.json', fixturePackageJson);

    return resetTask.run();
  });
});
