'use strict';

var alljoyn = require('alljoyn');

function Plugin(messenger, options){
  this.messenger = messenger;
  this.options = options;

  var sessions = this.sessions = [];

  function onFound(name){
    console.log('FoundAdvertisedName', name);
    var sessionId = bus.joinSession(name, 27, 0);
    console.log('JoinSession ' + sessionId);
    sessions.push(sessionId);
  }

  function onLost(name){
    console.log('LostAdvertisedName', name);
  }

  function onChanged(name){
    console.log('NameOwnerChanged', name);
  }

  var bus = this.bus = alljoyn.BusAttachment('skynet-alljoyn');
  var inter = alljoyn.InterfaceDescription();
  var listener = alljoyn.BusListener(onFound, onLost, onChanged);

  bus.createInterface(this.options.advertisedName, inter);
  bus.registerBusListener(listener);

  bus.start();
  bus.connect();

  return this;
}

Plugin.prototype.onMessage = function(data, callback){
  console.log('skynet-alljoyn message received: ', data);

  if(data.payload.method === 'send'){
    this.bus.findAdvertisedName(this.options.advertisedName);

    // TODO: send message
  }

  if(data.payload.method === 'listen'){
    // TODO: listen for messages
  }

  if(callback){
    callback(data);
  }
};

Plugin.prototype.destroy = function(){
  this.bus.disconnect();
  this.bus.stop();
};

var messageSchema = {
  type: 'object',
  properties: {
    method: {
      type: 'string',
      required: true
    },
    message: {
      type: 'string'
    }
  }
};

var optionsSchema = {
  type: 'object',
  properties: {
    advertisedName: {
      type: 'string',
      required: true
    }
  }
};

module.exports = {
  Plugin: Plugin,
  messageSchema: messageSchema,
  optionsSchema: optionsSchema
};
