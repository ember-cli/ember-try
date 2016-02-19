'use strict';
var TryEachCommand = require('./try-each');
var extend = require('extend');

module.exports = extend({}, TryEachCommand, {
  name: 'try:testall',
  description: '(Deprecated, use try:each). Runs `ember test` with each of the dependency scenarios specified in config.'
});
