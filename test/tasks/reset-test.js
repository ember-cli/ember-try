'use strict';

let tmp = require('tmp-sync');
let path = require('path');
let RSVP = require('rsvp');
let fs = require('fs-extra');
let fixtureBower = require('../fixtures/bower.json');
let writeJSONFile = require('../helpers/write-json-file');

let remove = RSVP.denodeify(fs.remove);
let root = process.cwd();
let tmproot = path.join(root, 'tmp');
let tmpdir;

describe('reset', () => {
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
