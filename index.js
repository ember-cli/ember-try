'use strict';

module.exports = {
  name: 'ember-try',

  includedCommands() {
    return {
      'try:config': require('./lib/ember-cli-commands/config'),
      'try:each': require('./lib/ember-cli-commands/try-each'),
      'try:ember': require('./lib/ember-cli-commands/try-ember'),
      'try:one': require('./lib/ember-cli-commands/try-one'),
      'try:reset': require('./lib/ember-cli-commands/reset'),
    };
  },
};
