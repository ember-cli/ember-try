var should        = require('should');
var RSVP          = require('rsvp');
var fs            = require('fs-extra');
var path          = require('path');
var tmp           = require('tmp-sync');
var fixturePackage  = require('./fixtures/package.json');
var NpmAdapter  = require('../lib/utils/npm-adapter');
var writeJSONFile = require('./helpers/write-json-file');

var remove = RSVP.denodeify(fs.remove);
var stat = RSVP.denodeify(fs.stat);
var root = process.cwd();
var tmproot = path.join(root, 'tmp');
var tmpdir;

describe('npmAdapter', function() {
  beforeEach(function() {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
  });

  afterEach(function() {
    process.chdir(root);
    return remove(tmproot);
  });

  describe('#setup', function() {
    it('backs up the package.json file and node_modules', function() {
      fs.mkdirSync('node_modules');
      writeJSONFile('node_modules/prove-it.json', {originalNodeModules: true});
      writeJSONFile('package.json', {originalPackageJSON: true});
      return new NpmAdapter({cwd: tmpdir}).setup().then(function() {
        assertFileContainsJSON('package.json.ember-try', {originalPackageJSON: true});
        assertFileContainsJSON('.node_modules.ember-try/prove-it.json', {originalNodeModules: true});
      }).catch(function(err) {
        console.log(err);
        true.should.equal(false, 'Error should not happen');
      });
    });
  });

  describe('#_install', function() {
    it('runs npm prune and npm install', function() {
      writeJSONFile('package.json', fixturePackage);
      var runCount = 1;
      var stubbedRun = function(command, args, opts) {
        command.should.equal('npm');
        if (runCount == 1) {
          args[0].should.equal('install');
        } else {
          args[0].should.equal('prune');
        }
        opts.should.have.property('cwd', tmpdir);
        runCount++;
        return new RSVP.Promise(function(resolve, reject) {
          resolve();
        });
      };
      return new NpmAdapter({cwd: tmpdir, run: stubbedRun})._install().catch(function(err) {
        console.log(err);
        true.should.equal(false, 'Error should not happen');
      });
    });
  });

  describe('#_restoreOriginalDependencies', function() {
    it('replaces the package.json with the backed up version', function() {
      writeJSONFile('package.json.ember-try', {originalPackageJSON: true});
      writeJSONFile('package.json', {originalPackageJSON: false});
      fs.mkdirSync('.node_modules.ember-try');
      writeJSONFile('.node_modules.ember-try/prove-it.json', {originalNodeModules: true});
      return new NpmAdapter({cwd: tmpdir})._restoreOriginalDependencies().then(function() {
        assertFileContainsJSON('package.json', {originalPackageJSON: true});
        assertFileContainsJSON('node_modules/prove-it.json', {originalNodeModules: true});
      }).catch(function(err) {
        console.log(err);
        true.should.equal(false, 'Error should not happen');
      });
    });
  });

  describe('#_packageJSONForDependencySet', function() {
    it('changes specified dependency versions', function() {
      var npmAdapter = new NpmAdapter({cwd: tmpdir});
      var packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' }, dependencies: { 'ember-cli-babel': '5.0.0'} };
      var depSet =  { dependencies: { 'ember-cli-babel': '6.0.0' } };

      var resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      resultJSON.dependencies['ember-cli-babel'].should.equal('6.0.0');
    });

    it('changes specified bower dev dependency versions', function() {
      var npmAdapter = new NpmAdapter({cwd: tmpdir});
      var packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' }, dependencies: { 'ember-cli-babel': '5.0.0'} };
      var depSet =  { devDependencies: { 'ember-feature-flags': '2.0.1' } };

      var resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      resultJSON.devDependencies['ember-feature-flags'].should.equal('2.0.1');
    });
  });
});

function assertFileContainsJSON(filename, expectedObj) {
  return assertFileContains(filename, JSON.stringify(expectedObj, null, 2));
}

function assertFileContains(filename, expectedContents) {
  var regex = new RegExp(escapeForRegex(expectedContents) + '($|\\W)', 'gm');
  var actualContents = fs.readFileSync(path.join(tmpdir, filename), { encoding: 'utf-8' });
  var result = regex.test(actualContents);
  result.should.equal(true, 'File ' + filename + ' is expected to contain ' + expectedContents);
}

function escapeForRegex(str) {
  return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
}
