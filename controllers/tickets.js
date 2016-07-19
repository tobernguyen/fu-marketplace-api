/**
 * Created by mk on 19/07/2016.
 */
'use strict';

var _ = require('lodash');
var errorHandlers = require('./helpers/errorHandlers');
var models = require('../models');
var Ticket = models.Ticket;
var Order = models.Order;

const DEFAULT_PAGE_SIZE = 10;

exports.putTicket = (req, res) => {
  let user = req.user;
  let ticketId = req.params.ticketId;

  let reqBody = req.body;
  let ticketUpdateInfo = _.pick(reqBody, ['userNote']);

  Ticket.findOne({
    where: {
      id: ticketId
    },
    include: [{
      model: Order,
      where: { userId: user.id }
    }]
  }).then(t => {
    if (!t) {
      let error = 'Ticket does not exist';
      return Promise.reject({status: 404, message: error, type: 'model'});
    } else {
      return t.updateTicket(ticketUpdateInfo);
    }
  }).then(t => {
    let result = t.toJSON();
    result.order = result.Order;
    delete result.Order;
    res.json(result);
  }).catch((err) => {
    if (err.status) {
      errorHandlers.responseError(err.status, err.message, err.type, res);
    } else {
      errorHandlers.handleModelError(err, res);
    }
  });
};

exports.postCloseTicket = (req, res) => {
  let user = req.user;
  let ticketId = req.params.ticketId;

  Ticket.findOne({
    where: {
      id: ticketId
    },
    include: [{
      model: Order,
      where: { userId: user.id }
    }]
  }).then(t => {
    if (!t) {
      let error = 'Ticket does not exist';
      return Promise.reject({status: 404, message: error, type: 'model'});
    } else {
      return t.closeTicket();
    }
  }).then(t => {
    let result = t.toJSON();
    result.order = result.Order;
    delete result.Order;
    res.json(result);
  }).catch((err) => {
    if (err.status) {
      errorHandlers.responseError(err.status, err.message, err.type, res);
    } else {
      errorHandlers.handleModelError(err, res);
    }
  });
};

exports.postReopenTicket = (req, res) => {
  let user = req.user;
  let ticketId = req.params.ticketId;

  Ticket.findOne({
    where: {
      id: ticketId
    },
    include: [{
      model: Order,
      where: { userId: user.id }
    }]
  }).then(t => {
    if (!t) {
      let error = 'Ticket does not exist';
      return Promise.reject({status: 404, message: error, type: 'model'});
    } else {
      return t.reopenTicket();
    }
  }).then(t => {
    let result = t.toJSON();
    result.order = result.Order;
    delete result.Order;
    res.json(result);
  }).catch((err) => {
    if (err.status) {
      errorHandlers.responseError(err.status, err.message, err.type, res);
    } else {
      errorHandlers.handleModelError(err, res);
    }
  });
};

exports.getTicket = (req, res) => {
  let user = req.user;
  let ticketId = req.params.ticketId;

  Ticket.findOne({
    where: {
      id: ticketId
    },
    include: [{
      model: Order,
      where: { userId: user.id }
    }]
  }).then(t => {
    if (!t) {
      let error = 'Ticket does not exist';
      return Promise.reject({status: 404, message: error, type: 'model'});
    } else {
      return Promise.resolve(t);
    }
  }).then(t => {
    let result = t.toJSON();
    result.order = result.Order;
    delete result.Order;
    res.json(result);
  }).catch((err) => {
    if (err.status) {
      errorHandlers.responseError(err.status, err.message, err.type, res);
    } else {
      errorHandlers.handleModelError(err, res);
    }
  });
};
