'use strict';

var tmp           = require('tmp-sync');
var path          = require('path');
var RSVP          = require('rsvp');
var fs            = require('fs-extra');
var fixtureBower  = require('../fixtures/bower.json');
var writeJSONFile = require('../helpers/write-json-file');

var remove  = RSVP.denodeify(fs.remove);
var root    = process.cwd();
var tmproot = path.join(root, 'tmp');
var tmpdir;

describe('reset', function() {
  beforeEach(function() {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
  });

  afterEach(function() {
    process.chdir(root);
    return remove(tmproot);
  });

  it('runs without blowing up', function() {
    this.timeout(15000);
    var config = {
      scenarios: [{
        name: 'first',
        dependencies: {
          ember: '1.13.0'
        }
      }]
    };

    var ResetTask = require('../../lib/tasks/reset');
    var resetTask = new ResetTask({
      project: {root: tmpdir},
      config: config
    });

    writeJSONFile('bower.json', fixtureBower);
    writeJSONFile('bower.json.ember-try', fixtureBower);

    return resetTask.run();
  });

});
