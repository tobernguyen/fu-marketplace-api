'use strict';

var Promise = require('bluebird');
var jwt = Promise.promisifyAll(require('jsonwebtoken'));
var validateUser = require('../controllers/auth').validateUser;

module.exports = function(req, res, next) {
  var token = (req.body && req.body.access_token) || (req.query && req.query.access_token) || req.headers['x-access-token'];
  var key = (req.body && req.body.x_key) || (req.query && req.query.x_key) || req.headers['x-key'];
  if (token || key) {
    jwt.verifyAsync(token, process.env.TOKEN_SECRET).then(decoded => {
      return validateUser(decoded);
    }).then(user => {
      // Authenticate user and pass it to next middleware
      if (user) {
        if (user.banned) {
          // User has been banned
          res.status(403);
          res.json({
            'status': 403,
            'message': 'You have been temporarily banned from FUM',
            'message_code': 'error.authentication.temporarily_banned'
          });
        } else {
          req.user = user;
          next();
        }
      } else {
        // No user with this name exists, respond back with a 401
        res.status(401);
        res.json({
          'status': 401,
          'message': 'Invalid User',
          'message_code': 'error.user.invalid_user'
        });
      }
    }, err => {
      if (err.name === 'TokenExpiredError') {
        res.status(440);
        res.json({
          'status': 440,
          'message': 'Token Expired',
          'message_code': 'error.authentication.token_expired'
        });
      } else if (err.name === 'JsonWebTokenError') {
        res.status(401);
        res.json({
          'status': 401,
          'message': 'Invalid Token or Key',
          'message_code': 'error.authentication.invalid_token'
        });
      } else {
        res.status(500);
        res.json({
          'status': 500,
          'message': 'Oops something went wrong',
          'error': err
        });
      }
    });
  } else {
    res.status(401);
    res.json({
      'status': 401,
      'message': 'Invalid Token',
      'message_code': 'error.authentication.invalid_token'
    });
  }
};
