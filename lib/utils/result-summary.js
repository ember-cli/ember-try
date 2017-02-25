'use strict';

var CoreObject = require('core-object');
var chalk = require('chalk');
var Table = require('cli-table2');

module.exports = CoreObject.extend({
  print: function() {
    var task = this;
    var colorAndMessage;
    var failMessage;
    var countPassed = 0;
    var countFailed = 0;
    var allowedFailCount = 0;
    task._printResultHeader();

    this.results.forEach(function(scenario) {
      if (scenario.result) {
        colorAndMessage = chalk.green('Scenario ' + scenario.scenario + ': SUCCESS');
        countPassed++;
      } else {
        failMessage = 'Scenario ' + scenario.scenario + ': FAIL';

        if (scenario.allowedToFail) {
          failMessage = failMessage + ' (Allowed)';
          allowedFailCount++;
        }

        colorAndMessage = chalk.red(failMessage);
        countFailed++;
      }
      task.ui.writeLine(colorAndMessage);
      task.ui.writeLine('Command run: ' + scenario.command);
      task._printDependencyTable(scenario.dependencyState);
    });

    task.ui.writeLine('');
    task._printResultsSummary(countFailed, countPassed, allowedFailCount, this.results.length);
  },
  _printResultHeader: function() {
    var task = this;
    task.ui.writeLine('');
    task.ui.writeLine('------ RESULTS ------');
    task.ui.writeLine('');
  },
  _printDependencyTable: function(dependencyStatus) {
    if (!dependencyStatus.length) { return; }
    var task = this;
    var colorForDepFn;
    var tableRow;
    var table = new Table({
      head: [chalk.gray('Dependency'), chalk.gray('Expected'), chalk.gray('Used'), chalk.gray('Type')],
      colWidths: [20, 20, 30, 10]
    });
    dependencyStatus.forEach(function(dep) {
      if (dep.versionExpected === dep.versionSeen) {
        colorForDepFn = chalk.green;
      } else {
        colorForDepFn = chalk.yellow;
      }
      tableRow = [dep.name, dep.versionExpected || 'Not Installed', dep.versionSeen || 'Not Installed', dep.packageManager].map(function(column) {
        return colorForDepFn(column);
      });
      table.push(tableRow);
    });
    task.ui.writeLine(table);
    task.ui.writeLine('');
  },
  _printResultsSummary: function(countFailed, countPassed, allowedFailCount, total) {
    var task = this;
    if (countFailed) {
      var failMessage = countFailed + ' scenarios failed';
      if (allowedFailCount) {
        failMessage = failMessage + ' (' + allowedFailCount + ' allowed)';
      }
      task.ui.writeLine(chalk.red(failMessage));
      task.ui.writeLine(chalk.green(countPassed + ' scenarios succeeded'));
      task.ui.writeLine(chalk.gray(total + ' scenarios run'));
    } else {
      task.ui.writeLine(chalk.green('All ' + countPassed + ' scenarios succeeded'));
    }
  }
});
