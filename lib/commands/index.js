'use strict';

module.exports = {
  try:           require('./try'),
  'try:testall': require('./testall'),
  'try:reset':   require('./reset'),
  'try:each':    require('./try-each'),
  'try:one':     require('./try-one'),
  'try:ember':   require('./try-ember'),
  'try:config':  require('./config')
};
