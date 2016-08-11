/**
 * Created by mk on 19/07/2016.
 */
'use strict';

var _ = require('lodash');
var errorHandlers = require('./helpers/errorHandlers');
var models = require('../models');
var Ticket = models.Ticket;
var Order = models.Order;
var Shop = models.Shop;

const DEFAULT_PAGE_SIZE = 10;

exports.getTickets = (req, res) => {
  let user = req.user;
  let size = _.toNumber(req.query.size);
  let page = _.toNumber(req.query.page);
  let status = req.query.status;

  let perPage = size > 0 ? size : DEFAULT_PAGE_SIZE;
  let offset = page > 0 ? (page - 1) * perPage : 0;

  let ticketFindOption = {
    include: {
      model: Order,
      where: { userId: user.id },
      include: {
        model: Shop,
        attributes: ['id', 'name']
      }
    },
    limit: perPage,
    offset: offset,
    order: [
      ['status'],
      ['updatedAt', 'DESC']
    ]
  };

  if (status){
    if (!_.isNumber(Ticket.STATUS[status])) {
      let error = 'Invalid status query';
      errorHandlers.responseError(400, error, 'query', res);
      return;
    } else {
      ticketFindOption.where = {
        status: Ticket.STATUS[status]
      };
    }
  }

  Ticket.findAll(ticketFindOption).then(tickets => {
    let result = _.map(tickets, o => {
      let ticket = o.toJSON();

      ticket.order = ticket.Order;
      ticket.shop = ticket.Order.Shop.get();
      delete ticket.Order;

      return ticket;
    });
    res.json({
      tickets: result
    });
  }).catch(err => {
    errorHandlers.handleModelError(err, res);
  });
};

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
      return t.closeTicketByUser();
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
    include: {
      model: Order,
      where: { userId: user.id },
      include: {
        model: Shop,
        attributes: ['id', 'name']
      }
    }
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
    result.shop = result.Order.Shop.get();
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
