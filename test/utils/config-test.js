var should        = require('should');
var RSVP          = require('rsvp');
var fs            = require('fs-extra');
var path          = require('path');
var tmp           = require('tmp-sync');
var getConfig     = require('../../lib/utils/config');
var defaultConfig = getConfig._defaultConfig;

var remove = RSVP.denodeify(fs.remove);
var stat = RSVP.denodeify(fs.stat);
var root = process.cwd();
var tmproot = path.join(root, 'tmp');
var tmpdir;

describe('utils/config', function() {
  var project;

  beforeEach(function() {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
    project = { root: tmpdir };
  });

  afterEach(function() {
    process.chdir(root);
    return remove(tmproot);
  });

  function generateConfigFile(contents, _filename) {
    var filename = _filename || 'ember-try.js';
    fs.mkdirsSync('config');

    fs.writeFileSync('config/' + filename, contents, { encoding: 'utf8' });
  }

  it('uses specified options.configFile if present', function() {
    generateConfigFile('module.exports = { scenarios: [ { qux: "baz" }] };', 'non-default.js');

    var config = getConfig({ project: project, configPath: 'config/non-default.js' });
    config.scenarios.should.have.length(1);
    config.scenarios[0].qux.should.equal('baz');
  });

  it('uses projects config/ember-try.js if present', function() {
    generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };');

    var config = getConfig({ project: project });
    config.scenarios.should.have.length(1);
    config.scenarios[0].foo.should.equal('bar');
  });

  it('uses default config if project.root/config/ember-try.js is not present', function() {
    var config = getConfig({ project: project });
    config.should.eql(defaultConfig());
  });

  it('uses specified options.configFile over project config/ember-try.js', function() {
    generateConfigFile('module.exports = { scenarios: [ { qux: "baz" }] };', 'non-default.js');
    generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };'); // Should not be used

    var config = getConfig({ project: project, configPath: 'config/non-default.js' });
    config.scenarios.should.have.length(1);
    config.scenarios[0].qux.should.equal('baz');
  });
});
