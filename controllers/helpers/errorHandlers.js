'use strict';

var _ = require('lodash');
var ValidationError = require('sequelize').ValidationError;

module.exports = {
  modelErrorHandler: function(err, res) {
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
      res.status(500);
      res.json({
        status: 500,
        error: err.message
      });
    }
  },
  responseError: (code, error, kind, res) => {
    res.status(code);
    res.json({
      status: code,
      error: error,
      message_code: `error.${kind}.${_.snakeCase(error)}`
    });
  }
};