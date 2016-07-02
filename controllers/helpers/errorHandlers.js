'use strict';

var _ = require('lodash');
var ValidationError = require('sequelize').ValidationError;
var ForeignKeyConstraintError = require('sequelize').ForeignKeyConstraintError;
var DatabaseError = require('sequelize').DatabaseError;
var logger = require('../../libs/logger');
var Promise = require('bluebird');
var AggregateError = Promise.AggregateError;

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
    } else if (err instanceof ForeignKeyConstraintError) {
      res.status(422);
      res.json({
        status: 422,
        message: err.message,
        message_code: `error.model.${_.snakeCase(err.message)}`
      });
    } else if (err instanceof DatabaseError) {
      res.status(422);
      res.json({
        status: 422,
        message: err.message,
        message_code: `error.model.${_.snakeCase(err.message)}`
      });
    } else if (err instanceof AggregateError) {

      let errors = {};
      err.forEach(e => {
        e.errors.errors.forEach(er => {
          errors[`${type(e.record)}.${er.path}`] = {
            message: er.message,
            message_code: `error.model.${_.snakeCase(er.message)}`
          };
        });
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

var type = (obj) => {
  return obj.constructor.toString().slice(8, -1);
};
