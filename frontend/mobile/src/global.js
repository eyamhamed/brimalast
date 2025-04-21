// src/global.js
// Polyfill for setImmediate
if (typeof global.setImmediate === 'undefined') {
    global.setImmediate = function(callback, ...args) {
      return setTimeout(callback, 0, ...args);
    };
  }
  
  // Polyfill for clearImmediate
  if (typeof global.clearImmediate === 'undefined') {
    global.clearImmediate = function(id) {
      return clearTimeout(id);
    };
  }