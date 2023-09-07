'use strict';

const tmp = require('tmp-sync');
const path = require('path');
const RSVP = require('rsvp');
const fs = require('fs-extra');
const fixturePackageJson = require('../fixtures/package.json');
const writeJSONFile = require('../helpers/write-json-file');

const remove = RSVP.denodeify(fs.remove);
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
    return remove(tmproot);
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

    let ResetTask = require('../../lib/tasks/reset');
    let resetTask = new ResetTask({
      project: { root: tmpdir },
      config,
    });

    writeJSONFile('package.json', fixturePackageJson);

    return resetTask.run();
  });
});
