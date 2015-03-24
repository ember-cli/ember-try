'use strict';
var Task            = require('ember-cli/lib/models/task');
var RSVP            = require('rsvp');
var ScenarioManager = require('../utils/scenario-manager');
var run             = require('../utils/run');
var BowerHelpers    = require('../utils/bower-helpers');

module.exports = Task.extend({
  run: function(scenario, commandName){
    var task = this;

    process.on('SIGINT', function() {
      console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
      BowerHelpers.cleanup(task.project.root).then(function(){
        process.exit( );
      });
    });

    this.ScenarioManager = new ScenarioManager({ui: this.ui, project: this.project});
    return this.ScenarioManager.changeTo(scenario)
      .then(function(){
        return run('ember', [commandName], {cwd: task.project.root})
          .then(function(){
            return RSVP.resolve(true);
          })
          .catch(function(){
            return RSVP.resolve(false);
          });
      })
      .finally(function(result){
        return BowerHelpers.cleanup(task.project.root).then(function(){
          if(!result){
            task.ui.writeLine('');
            task.ui.writeLine('ember ' + commandName + ' with scenario ' + scenario.name + ' exited nonzero');
            process.exit(1);
          }
          else {
            process.exit(0);
          }
        });
      });
  }
});
