'use strict';
let TryEachCommand = require('./try-each');
let extend = require('extend');

module.exports = extend({}, TryEachCommand, {
  name: 'try:testall',
  description: '(Deprecated, use try:each). Runs `ember test` with each of the dependency scenarios specified in config.',
});
