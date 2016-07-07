'use strict';

var io = require('socket.io-emitter')(process.env.REDIS_URI.replace('redis://', ''), {key: process.env.SOCKET_IO_REDIS_PREFIX || 'socket.io'});

exports.pushToPublicChannel = (event, data) => {
  io.to('public-channel').emit(event, data);
};

exports.pushToPrivateChannel = (userId, event, data) => {
  io.to(`user.${userId}`).emit(event, data);
};

exports.EVENT = {
  NEW_NOTIFICATION: 'new-notification'
};
