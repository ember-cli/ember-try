var npmHelpers = require('../lib/utils/npm-helpers');
var should = require("should");
var path = require("path");
var fs = require("fs");
var MockProject = require('./helpers/mock-project');

describe('npmHelpers', function(){
  var proj = null;
  beforeEach(function () {
    proj = new MockProject('.scratch');
    return proj.setup();
  });

  afterEach(function() {
    return proj.destroy();
  });

  describe('#resetNpmFile()', function() {
    // actual npm install could take a while
    this.timeout(60000);
    it('should replace a package.json with the package.json.ember-try', function(done) {
      proj.createNpmBackup({
          npm: {
            devDependencies: {
              lodash: '^3.0.0'
            }
          }
        }).then(function() {
        npmHelpers.resetNpmFile(proj.projectRoot).then(function () {
          proj.npmData().then(function(data) {
            data.devDependencies.lodash.should.equal('^3.0.0');
            done();
          });
        });
      });
    });
  });

  describe('#_npmFoldersToClearForScenario()', function() {
    it('clear out dependencies that change versions', function(done) {
      npmHelpers._npmFoldersToClearForScenario({
        npm: {
          dependencies: {
            lodash: '~1.0.0',
            rimraf: null
          },
          devDependencies: {
            rsvp: 'tildeio/rsvp#master'
          }
        }
      }).should.eql(['lodash', 'rimraf', 'rsvp']);
      done();
    });
  });

  describe('#_npmFoldersToInstallForScenario()', function() {
    it('clear out dependencies that change versions', function(done) {
      npmHelpers._npmFoldersToInstallForScenario({
        npm: {
          dependencies: {
            lodash: '~1.0.0',
            rimraf: null
          },
          devDependencies: {
            rsvp: 'tildeio/rsvp#master'
          }
        }
      }).should.eql(['lodash@~1.0.0', 'rsvp@tildeio/rsvp#master']);
      done();
    });
  });

  describe('#cleanup()', function() {
    // actual npm install could take a while
    this.timeout(60000);
    it('should cleanup the npm situation in a test scenario', function(done) {
      proj.createNpmBackup({
          npm: {
            devDependencies: {
              lodash: '^3.0.0'
            }
          }
        }).then(function() {
        proj.backupNpmData().then(function(bnd) {
          bnd.devDependencies.lodash.should.equal('^3.0.0');
          proj.npmData()
            .then(function(npmData) {
              npmData.devDependencies.lodash.should.equal('^2.0.0');
            })
            .then(function () {
              return npmHelpers.cleanup(proj.projectRoot).then(function() {
                proj.npmData().then(function(npmData) {
                  npmData.devDependencies.lodash.should.equal('^3.0.0');
                  done();
                });
              });
            });
        });
      });
    });
  });

  describe('#deleteNpmPackage()', function() {
    // actual npm install could take a while
    this.timeout(60000);
    it('should rimraf folders from node_modules', function(done) {
      var scenario = {
        npm: {
          devDependencies: {
            'rsvp': '^1.0.1'
          }
        }
      };
      proj.createNpmBackup(scenario).then(function() {
        npmHelpers.cleanup(proj.projectRoot).then(function () {
          proj.npmData().then(function(data) {
            data.devDependencies.rsvp.should.equal('^1.0.1');
            fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'rsvp')).should.equal(true);
            npmHelpers.deleteNpmPackage(proj.projectRoot, 'rsvp').then(function () {
              fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'rsvp')).should.equal(false);
              done();
            });
          });
        });
      });
    });
  });

  describe('#deleteNpmPackages()', function() {
    // actual npm install could take a while
    this.timeout(60000);
    it('should rimraf folders from node_modules', function(done) {
      var scenario = {
        npm: {
          devDependencies: {
            'rsvp': '^1.0.1',
            'koa': '*'
          }
        }
      };
      proj.createNpmBackup(scenario).then(function() {
        npmHelpers.cleanup(proj.projectRoot).then(function () {
          proj.npmData().then(function(data) {
            data.devDependencies.rsvp.should.equal('^1.0.1');
            fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'rsvp')).should.equal(true);
            fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'lodash')).should.equal(true);
            fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'koa')).should.equal(true);
            npmHelpers.deleteNpmPackages(proj.projectRoot, ['rsvp', 'koa', 'lodash']).then(function () {
              fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'rsvp')).should.equal(false);
              fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'lodash')).should.equal(false);
              fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'koa')).should.equal(false);
              done();
            });
          });
        });
      });
    });
  });

  describe('#install()', function() {
    // actual npm install could take a while
    this.timeout(60000);
    it('should setup node_modules in a project without an existing node_modules', function(done) {
        npmHelpers.install(proj.projectRoot, {}).then(function () {
            fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'qs')).should.equal(true);
            fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'lodash')).should.equal(true);
            fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'express')).should.equal(true);
            done();
        });
    });

    it('should install a scenario when node_modules already exists', function(done) {
      var scenario = {
        npm: {
          devDependencies: {
            'rsvp': '^1.0.1', // Add this package
            'express': null // Remove this package
          }
        }
      };
      npmHelpers.install(proj.projectRoot, {}).then(function () {
        fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'qs')).should.equal(true);
        fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'lodash')).should.equal(true);
        fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'express')).should.equal(true);
        fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'rsvp')).should.equal(false);
        npmHelpers.install(proj.projectRoot, scenario).then(function () {
          fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'qs')).should.equal(true);
          fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'lodash')).should.equal(true);
          fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'express')).should.equal(false);
          fs.existsSync(path.join(proj.projectRoot, 'node_modules', 'rsvp')).should.equal(true);
          done();
        });
      });
    });
  });


  describe('#backupNpmFile()', function() {
    // actual npm install could take a while
    this.timeout(10000);
    it('should copy package.json to package.json.ember-try', function(done) {
      proj.createNpmBackup({
          npm: {
            dependencies: {
              lodash: '^3.0.0'
            }
          }
        }).then(function() {
        npmHelpers.backupNpmFile(proj.projectRoot).then(function () {
          proj.backupNpmData().then(function(npmData) {
            npmData.devDependencies.lodash.should.equal('^2.0.0');
            done();
          });
        });
      });
    });
  });
});
