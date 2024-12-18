const chalk = require('chalk');

let logFunction = originalLogFunction;

function error(message) {
  logFunction(message, console.error, chalk.red);
}

function info(message) {
  logFunction(message, console.info, chalk.blue);
}

function log(message) {
  logFunction(message, console.log);
}

function prefix(string) {
  return chalk.inverse(` ${string} `);
}

function success(message) {
  logFunction(message, console.log, chalk.green);
}

function warn(message) {
  logFunction(message, console.warn, chalk.yellow);
}

function originalLogFunction(message, consoleLogFunction, chalkColorFunction) {
  consoleLogFunction(chalkColorFunction ? chalkColorFunction(message) : message);
}

function mockLog(mockedLogFunction) {
  logFunction = mockedLogFunction;
}

function restoreLog() {
  logFunction = originalLogFunction;
}

module.exports = {
  error,
  info,
  log,
  prefix,
  success,
  warn,

  _mockLog: mockLog,
  _restoreLog: restoreLog,
};
