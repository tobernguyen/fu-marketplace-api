'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models').User;
const Promise = require('bluebird');
const _ = require('lodash');

const authErrorResponse = {
  'status': 401,
  'message': 'Invalid credentials',
  'message_code': 'error.authentication.invalid_credentials'
};

var auth = {
  login: (req, res) => {
    let email = req.body.email || '';
    let password = req.body.password || '';

    if (email == '' || password == '') {
      res.status(401);
      res.json(authErrorResponse);
      return;
    }

    // Fire a query to your DB and check if the credentials are valid
    return auth.validate(email, password).then(user => {
      res.json(genToken(user));
    }, () => {
      res.status(401);
      res.json(authErrorResponse);
    });
  },

  validate: function(email, password) {
    let user;

    return User.findOne({where: {email: email}}).then(u => {
      if (u) {
        user = u;
        return user.verifyPassword(password);
      } else {
        return Promise.reject();
      }
    }).then(isVerified => {
      if (isVerified) {
        return Promise.resolve(user);
      } else {
        return Promise.reject();
      }
    });
  },

  validateUser: function(tokenData) {
    return User.findById(tokenData.id).then(u => {
      // Check if this token is expired by user
      if (u && u.acceptTokenAfter && tokenData.iat * 1000 < u.acceptTokenAfter) {
        let error = new Error('TokenExpiredError');
        error.name = 'TokenExpiredError';
        return Promise.reject(error);
      }
      return Promise.resolve(u);
    });
  }
};

// generate token expires in 2 months
function genToken(user) {
  let ttl = 60 * 24 * 60 * 60; // 2 months
  let payload = _.pick(user, 'id');
  let token = jwt.sign(payload, process.env.TOKEN_SECRET, {
    expiresIn: ttl
  });

  return {
    token: token,
    ttl: ttl,
    user: user
  };
}

module.exports = auth;
