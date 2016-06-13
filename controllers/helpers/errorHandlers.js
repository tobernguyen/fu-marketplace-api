'use strict';

var _ = require('lodash');
var ValidationError = require('sequelize').ValidationError;
var logger = require('../../libs/logger');

module.exports = {
  handleModelError: function(err, res) {
    if (err instanceof ValidationError){
      let errors = {};
      
      err.errors.forEach(err => {
        errors[err.path] = {
          message: err.message,
          message_code: `error.model.${_.snakeCase(err.message)}`
        };
      });
      
      res.status(422);
      res.json({
        status: 422,
        errors: errors
      });
    } else {
      logger.error(err);
      res.status(500);
      res.json({
        status: 500,
        message: err.message,
        message_code: `error.model.${_.snakeCase(err.message)}`,
        error: process.env.NODE_ENV === 'production' ? '' : err
      });
    }
  },
  responseError: (code, error, kind, res) => {
    res.status(code);
    res.json({
      status: code,
      message: error,
      message_code: `error.${kind}.${_.snakeCase(error)}`
    });
  }
};