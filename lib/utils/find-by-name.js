'use strict';

module.exports = function findByName(arr, name) {
  var matches = (arr || []).filter(function(item) {
    if (item.name === name) {
      return item;
    }
  });
  return matches[0];
};
