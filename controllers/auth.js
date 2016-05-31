'use strict';

var jwt = require('jsonwebtoken');
var User = require('../models').User;
var Promise = require('bluebird');
var _ = require('lodash');
var googleApi = require('../libs/google-api');
var logger = require('../libs/logger');

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
  },
  
  loginWithGoogle: (req, res) => {
    let code = req.query.code || '';
    
    if (code == '') {
      res.status(401);
      res.json(authErrorResponse);
      return;
    }
    
    googleApi.getUserProfile(code).then(profile => {
      if (profile.hd && profile.hd === 'fpt.edu.vn') {
        User.findOne({ where: {email: profile.email} }).then(user => {
          if (!user) {
            return User.create({
              email: profile.email,
              fullName: profile.name.replace(/\(.+\)\s+/, ''),
              avatar: profile.picture,
              gender: profile.gender,
              googleId: profile.id,
              password: Math.random().toString()
            });
          } else {
            return Promise.resolve(user);
          }
        }).then(user => {
          res.json(genToken(user));
        });
      } else {
        res.status(401);
        res.json({
          status: 401,
          message: 'Please login with email @FPT.EDU.VN',
          message_code: 'error.authentication.wrong_email_domain'
        });
      }
    }, err => {
      if (err.message === 'invalid_grant') {
        res.status(400);
        res.json({
          status: 400,
          message: 'Invalid one-time code. Please login again.',
          message_code: 'error.authentication.invalid_one_time_code'
        });
      } else {
        logger.error(err);
        
        res.status(500);
        res.json({
          status: 500,
          message: 'Internal error',
          error: err,
          message_code: 'error.internal_error'
        });
      }
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
