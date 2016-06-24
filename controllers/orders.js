'use strict';

var _ = require('lodash');
var errorHandlers = require('./helpers/errorHandlers');
var models = require('../models');
var User = models.User;
var Shop = models.Shop;
var ShipPlace = models.ShipPlace;
var Order = models.Order;

exports.postPlaceOrder = (req, res) => {
  let user = req.user;
  let shopId = req.params.shopId;
  let reqBody = req.body;
  if (!reqBody.note) reqBody.note = '';
  
  Shop.findOne({
    where: {
      id: shopId,
      banned: {
        $not: true
      }
    },
    include: [
      ShipPlace,
      User
    ]
  }).then(s => {
    if (!s) {
      let error = 'Shop does not exits';
      return Promise.reject({status: 404, message: error, type: 'model'});
    } else {
      return s.placeOrder({
        user: user,
        reqBody: reqBody
      });
    }
  }).then((order) => {
    responseOrder(order, res);
  }).catch((err) => {
    if (err.status) {
      errorHandlers.responseError(err.status, err.message, err.type, res);
    } else {
      errorHandlers.handleModelError(err, res);
    }
  });
};

exports.putUpdateOrder = (req, res) => {
  let user = req.user;
  let shopId = req.params.shopId;
  let orderId = req.params.orderId;
  let reqBody = req.body;

  Order.findOne({
    where: {
      id: orderId,
      shopId: shopId,
      userId: user.id
    }
  }).then(o => {
    if (!o) {
      let error = 'Order does not exits';
      return Promise.reject({status: 404, message: error, type: 'model'});
    }

    if (o.status !== Order.STATUS.NEW) {
      let error = 'Cannot update accepted order';
      return Promise.reject({status: 403, message: error, type: 'order'});
    }

    let orderUpdateInfo = _.pick(reqBody, ['note', 'shipAddress']);
    return o.update(orderUpdateInfo);
  }).then(o => {
    responseOrder(o, res);
  }).catch((err) => {
    if (err.status) {
      errorHandlers.responseError(err.status, err.message, err.type, res);
    } else {
      errorHandlers.handleModelError(err, res);
    }
  });
};

var responseOrder = (order, res) => {
  let result = order.toJSON();
  order.getOrderLines({
    order: 'id'
  }).then(ols => {
    let orderLines = _.map(ols, r => _.pick(r, ['item', 'note', 'quantity']));
    result['orderLines'] = orderLines;
    res.json(result);
  });
};