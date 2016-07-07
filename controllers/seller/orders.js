'use strict';

var _ = require('lodash');
var models = require('../../models');
var errorHandlers = require('../helpers/errorHandlers');
var Order = models.Order;
var Shop = models.Shop;
var OrderLine = models.OrderLine;

const DEFAULT_PAGE_SIZE = 10;

exports.getOrderByShop = (req, res) => {
  let shopId = req.params.shopId;
  let status = req.query.status;
  let seller = req.user;
  let size = _.toNumber(req.query.size);
  let page = _.toNumber(req.query.page);

  let perPage = size > 0 ? size : DEFAULT_PAGE_SIZE;
  let offset = page > 0 ? (page - 1) * perPage : 0;
  
  let orderFindOption = {
    where: {
      shopId: shopId
    },
    include: [
      {
        model: OrderLine,
        attributes: ['item', 'note', 'quantity']
      },
      {
        model: Shop,
        attributes: ['ownerId'],
        where: {
          ownerId: seller.id
        }
      }
    ],
    limit: perPage,
    offset: offset
  };

  if (status) {
    orderFindOption.where.status = Order.STATUS[status];
  }

  
  Order.findAll(orderFindOption).then(os => {
    let result = _.map(os, o => {
      let order = o.toJSON();
      let orderLines = _.map(order.OrderLines, r => _.pick(r, ['item', 'note', 'quantity']));
      order.orderLines = orderLines;
      delete order.OrderLines;
      return order;
    });
    res.json({
      orders: result
    });
  }).catch(err => {
    errorHandlers.handleModelError(err, res);
  });
};

exports.acceptOrder = (req, res) => {
  tryToChangeOrderStatus(req, res, 'accept');
};

exports.rejectOrder = (req, res) => {
  tryToChangeOrderStatus(req, res, 'reject');
};

exports.shipOrder = (req, res) => {
  tryToChangeOrderStatus(req, res, 'startShipping');
};

exports.completeOrder = (req, res) => {
  tryToChangeOrderStatus(req, res, 'complete');
};

exports.abortOrder = (req, res) => {
  tryToChangeOrderStatus(req, res, 'abort');
};

var tryToChangeOrderStatus = (req, res, action) => {
  let seller = req.user;
  let orderId = req.params.orderId;


  Order.findOne({
    where: {
      id: orderId
    }, 
    include: [
      {
        model: Shop,
        attributes: ['ownerId'],
        where: {
          ownerId: seller.id
        }
      }
    ]
  }).then(o => {
    if (!o) {
      let error = 'Order does not exits';
      return Promise.reject({status: 404, message: error, type: 'model'});
    }

    let param = {};
    if (action === 'reject' || action === 'abort') {
      if (!req.body.sellerMessage) {
        let error = `Must provide seller message when ${action}`;
        return Promise.reject({
          status: 404,
          message: error,
          type: 'order'
        });
      } else {
        param = _.pick(req.body, 'sellerMessage');
        return o[action](param);
      }
    } else {
      return o[action]();
    }
  }).then(o => {
    responseOrder(o, res);
  }).catch(err => {
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