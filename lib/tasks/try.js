'use strict';
var CoreObject       = require('core-object');
var RSVP             = require('rsvp');
var ScenarioManager  = require('../utils/scenario-manager');
var run              = require('../utils/run');
var BowerHelpers     = require('../utils/bower-helpers');
var TestemHelpers    = require('../utils/testem-helpers');
var findEmberPath    = require('./../utils/find-ember-path');

module.exports = CoreObject.extend({
  run: function(scenario, commandArgs, commandOptions){
    var task = this;
    var commandName = commandOptions[1] || 'test';
    process.on('SIGINT', function() {
      task.ui.writeLine( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
      RSVP.all(BowerHelpers.cleanup(this.project.root),
        TestemHelpers.cleanup(this.project.root)).then(function(){
          process.exit( );
      });
    });

    this.ScenarioManager = new ScenarioManager({ui: this.ui, project: this.project});

    var useTestem = !!scenario.testem;
    var backupPromise = [BowerHelpers.backupBowerFile(task.project.root)];
    if (useTestem){
      backupPromise.push(TestemHelpers.backupTestemFile(task.project.root))
    }

    return RSVP.all(backupPromise).then(function(){
      return task.ScenarioManager.changeTo(scenario)
        .then(function() {
          return findEmberPath(task.project.root);
        })
        .then(function(emberPath){
          var args = [].concat(emberPath, commandArgs);

          return run('node', args, {cwd: task.project.root})
            .then(function(){
              return RSVP.resolve(true);
            })
            .catch(function(){
              return RSVP.resolve(false);
            });
        })
        .then(function(result){
          var promise;
          if(commandOptions.skipCleanup){
            //create a fake promise for consistency
            promise = RSVP.Promise.resolve();
          } else {
            promise = RSVP.all([BowerHelpers.cleanup(task.project.root),
              TestemHelpers.cleanup(task.project.root)]);
          }
          return promise.then(function(){
            if(!result){
              task.ui.writeLine('');
              task.ui.writeLine('ember ' + commandName + ' with scenario ' + scenario.name + ' exited nonzero');
              process.exit(1);
            }
            else {
              process.exit(0);
            }
          });
        })
        .catch(function(err){
          task.ui.writeLine(err);
          task.ui.writeLine(err.stack);
          process.exit(1);
        });
    });
  }
});
