'use strict';

const chalk = require('chalk');
const Table = require('cli-table3');
const { error, info, log, success } = require('./console');

module.exports = class ResultSummary {
  constructor(options) {
    this.results = options.results;
  }

  print() {
    let task = this;
    let colorAndMessage;
    let failMessage;
    let countPassed = 0;
    let countFailed = 0;
    let allowedFailCount = 0;
    task._printResultHeader();

    this.results.forEach((scenario) => {
      if (scenario.result) {
        colorAndMessage = chalk.green(`Scenario ${scenario.scenario}: SUCCESS`);
        countPassed++;
      } else {
        failMessage = `Scenario ${scenario.scenario}: FAIL`;

        if (scenario.allowedToFail) {
          failMessage = `${failMessage} (Allowed)`;
          allowedFailCount++;
        }

        colorAndMessage = chalk.red(failMessage);
        countFailed++;
      }
      log(colorAndMessage);
      log(`Command run: ${scenario.command}`);
      if (scenario.envState) {
        log(`with env: ${JSON.stringify(scenario.envState, null, 2)}`);
      }
      task._printDependencyTable(scenario.dependencyState);
    });

    log('');
    task._printResultsSummary(countFailed, countPassed, allowedFailCount, this.results.length);
  }

  _printResultHeader() {
    log('');
    log('------ RESULTS ------');
    log('');
  }

  _printDependencyTable(dependencyStatus) {
    if (!dependencyStatus.length) {
      return;
    }
    let colorForDepFn;
    let tableRow;
    let table = new Table({
      head: [
        chalk.gray('Dependency'),
        chalk.gray('Expected'),
        chalk.gray('Used'),
        chalk.gray('Type'),
      ],
      colWidths: [20, 20, 30, 10],
    });
    dependencyStatus.forEach((dep) => {
      if (dep.versionExpected === dep.versionSeen) {
        colorForDepFn = chalk.green;
      } else {
        colorForDepFn = chalk.yellow;
      }
      tableRow = [
        dep.name,
        dep.versionExpected || 'Not Installed',
        dep.versionSeen || 'Not Installed',
        dep.packageManager,
      ].map((column) => {
        return colorForDepFn(column);
      });
      table.push(tableRow);
    });
    log(table);
    log('');
  }

  _printResultsSummary(countFailed, countPassed, allowedFailCount, total) {
    if (countFailed) {
      let failMessage = `${countFailed} scenarios failed`;
      if (allowedFailCount) {
        failMessage = `${failMessage} (${allowedFailCount} allowed)`;
      }
      error(failMessage);
      success(`${countPassed} scenarios succeeded`);
      info(`${total} scenarios run`);
    } else {
      success(`All ${countPassed} scenarios succeeded`);
    }
  }
};
