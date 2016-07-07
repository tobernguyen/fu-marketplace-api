'use strict';

var Promise = require('bluebird');
var jwt = Promise.promisifyAll(require('jsonwebtoken'));
var validateUser = require('../controllers/auth').validateUser;

module.exports = function(socket) {
  let server = this.server || socket.server;
  let Namespace = Object.getPrototypeOf(server.sockets).constructor;
  if (!~Namespace.events.indexOf('authenticated')) {
    Namespace.events.push('authenticated');
  }

  socket.on('authenticate', data => {
    let onError = (err) => {
      clearTimeout(autoDisconnectTimeout);
      socket.disconnect(err);
    };

    let onSuccess = (user) => {
      clearTimeout(autoDisconnectTimeout);
      socket.user = user;
      socket.emit('authenticated');

      //try getting the current namespace otherwise fallback to all sockets.
      var namespace = (server.nsps && socket.nsp &&
        server.nsps[socket.nsp.name]) ||
        server.sockets;

      // explicit namespace
      namespace.emit('authenticated', socket);
    };

    let token = data.token;

    if (token) {
      jwt.verifyAsync(token, process.env.TOKEN_SECRET).then(decoded => {
        return validateUser(decoded);
      }).then(user => {
        if (user) {
          onSuccess(user);
        } else {
          onError('Unauthorized');
        }
      }).catch(err => {
        let errorMsg;

        if (err.name === 'TokenExpiredError') {
          errorMsg = 'Token Expired';
        } else if (err.name === 'JsonWebTokenError') {
          errorMsg = 'Invalid Token or Key';
        } else {
          errorMsg = 'Oops something went wrong';
        }

        onError(errorMsg);
      });
    } else {
      onError('Unauthorized');
    }
  });

  let autoDisconnectTimeout = setTimeout(() => {
    socket.disconnect('Unauthorized');
  }, 5000);
};
