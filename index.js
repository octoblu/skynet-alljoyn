'use strict';

var alljoyn = require('alljoyn');

function Plugin(messenger, options){
  this.messenger = messenger;
  this.options = options;
  return this;
}

module.exports = {
  Plugin: Plugin
};
