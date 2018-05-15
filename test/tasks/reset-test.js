'use strict';

const tmp = require('tmp-sync');
const path = require('path');
const RSVP = require('rsvp');
const fs = require('fs-extra');
const fixtureBower = require('../fixtures/bower.json');
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

  it('runs without blowing up', function() {
    this.timeout(15000);
    let config = {
      scenarios: [{
        name: 'first',
        dependencies: {
          ember: '1.13.0',
        },
      }],
    };

    let ResetTask = require('../../lib/tasks/reset');
    let resetTask = new ResetTask({
      project: { root: tmpdir },
      config,
    });

    writeJSONFile('bower.json', fixtureBower);
    writeJSONFile('bower.json.ember-try', fixtureBower);

    return resetTask.run();
  });

});
