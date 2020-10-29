'use strict';

const findEmberPath = require('./find-ember-path');
const run = require('./run');

module.exports = async function (root, commandArgs, opts) {
  let options = Object.assign({ cwd: root }, opts);
  let [command, ...actualArgs] = commandArgs;

  try {
    if (command === 'ember') {
      let emberPath = await findEmberPath(root);
      await run('node', [`"${emberPath}"`, ...actualArgs], options);
    } else {
      await run(command, actualArgs, options);
    }

    return true;
  } catch (errorCode) {
    if (errorCode !== 1) {
      throw new Error(`The command ${commandArgs.join(' ')} exited ${errorCode}`);
    } else {
      return false;
    }
  }
};
