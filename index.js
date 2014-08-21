'use strict';

var alljoyn = require('alljoyn');
var _ = require('lodash');

function Plugin(messenger, options){
  this.messenger = messenger;
  this.options = options;
  var self = this;

  self.sessions = [];

  function onFound(name){
    console.log('FoundAdvertisedName', name);
    var sessionId = bus.joinSession(name, 27, 0);
    console.log('JoinSession ' + sessionId);
    self.sessions = _.union([sessionId], self.sessions);
  }

  function onLost(name){
    console.log('LostAdvertisedName', name);
  }

  function onChanged(name){
    console.log('NameOwnerChanged', name);
  }

  var bus = this.bus = alljoyn.BusAttachment('skynet-alljoyn');
  var inter = this.inter = alljoyn.InterfaceDescription();
  var listener = alljoyn.BusListener(onFound, onLost, onChanged);

  bus.createInterface(this.options.interfaceName, inter);
  bus.registerBusListener(listener);

  bus.start();

  function onAcceptSessionJoiner(port, joiner){
    console.log("AcceptSessionJoiner", port, joiner);
    //TODO possibly be more selective
    return true;
  }

  function onSessionJoined(port, sId, joiner){
    self.sessions = _.union([sId], self.sessions);
    console.log("SessionJoined", port, sId, joiner);
  }

  bus.connect();

  if(this.options.advertisedName){

    var portListener = alljoyn.SessionPortListener(onAcceptSessionJoiner, onSessionJoined);
    var fullName = this.options.interfaceName + '.' + this.options.advertisedName;
    console.log("RequestName " + bus.requestName(fullName));
    console.log("AdvertiseName " + bus.advertiseName(fullName));
    console.log("BindSessionPort " + bus.bindSessionPort(27, portListener));
  }

  inter.addSignal(this.options.signalMemberName, "s", "msg");
  var messageObject = this.messageObject = alljoyn.BusObject(this.options.messageServiceName);
  messageObject.addInterface(inter);

  function onSignalReceived(msg, info){
    console.log("Signal received: ", msg, info);
    messenger.send({
      devices: self.options.relayUuid,
      payload: {
        msg: msg,
        info: info
      }
    });
  }
  if(this.options.relayUuid){
    bus.registerSignalHandler(messageObject, onSignalReceived, inter, this.options.signalMemberName);
  }

  bus.registerBusObject(messageObject);

  if(this.options.findAdvertisedName){
    bus.findAdvertisedName(this.options.findAdvertisedName);
  }


  return this;
}

Plugin.prototype.onMessage = function(data, callback){
  console.log('skynet-alljoyn message received: ', data);
  var self = this;

  if(!data.payload){ return; }

  if(data.payload.method === 'send' && data.payload.message){
    self.sessions.forEach(function(sessionId){
      console.log('sending from skynet to session', sessionId, self.options.signalMemberName);
      self.messageObject.signal(null, sessionId, self.inter, self.options.signalMemberName, data.payload.message);
    });
  }

  if(data.payload.method === 'notify'){
    // TODO: send notification
  }

  if(callback){
    callback(data.payload);
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
      required: false
    },
    interfaceName: {
      type: 'string',
      required: true
    },
    findAdvertisedName: {
      type: 'string',
      required: false
    },
    signalMemberName: {
      type: 'string',
      required: true
    },
    messageServiceName: {
      type: 'string',
      required: true
    },
    relayUuid: {
      type: 'string',
      required: false
    }

  }
};

function getDefaultOptions(callback){
    callback(null, {
      advertisedName: 'test',
      interfaceName: 'org.alljoyn.bus.samples.chat',
      findAdvertisedName: 'org.alljoyn.bus.samples.chat',
      signalMemberName: 'Chat',
      messageServiceName: '/chatService',
      relayUuid: '*'
    });
}

module.exports = {
  Plugin: Plugin,
  messageSchema: messageSchema,
  optionsSchema: optionsSchema,
  getDefaultOptions: getDefaultOptions
};
