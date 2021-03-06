'use strict';

var _ = require('lodash');
var models = require('../../models');
var errorHandlers = require('../helpers/errorHandlers');
var Order = models.Order;
var Shop = models.Shop;
var User = models.User;
var OrderLine = models.OrderLine;

const DEFAULT_PAGE_SIZE = 10;

exports.getOrdersByShop = (req, res) => {
  let shopId = req.params.shopId;
  let status = req.query.status;
  let type = req.query.type;
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
      },
      {
        model: User,
        attributes: ['id', 'fullName', 'avatar']
      }
    ],
    limit: perPage,
    offset: offset,
    order: [['id', 'DESC']]
  };

  if (type) {
    if (type === Order.TYPE.ACTIVE){
      orderFindOption.where.status = {
        $in: [Order.STATUS.NEW, Order.STATUS.ACCEPTED, Order.STATUS.SHIPPING]
      };
      orderFindOption.order = [['id', 'ASC']];
    } else {
      let error = 'Invalid type query';
      errorHandlers.responseError(400, error, 'query', res);
      return;
    }
  } else if (status){
    if (!_.isNumber(Order.STATUS[status])) {
      let error = 'Invalid status query';
      errorHandlers.responseError(400, error, 'query', res);
      return;
    } else {
      orderFindOption.order = [
        ['status'],
        ['id', 'DESC']
      ];
      orderFindOption.where.status = Order.STATUS[status];
    }
  }

  Order.findAll(orderFindOption).then(os => {
    let result = _.map(os, o => processOrderData(o));
    res.json({
      orders: result
    });
  }).catch(err => {
    errorHandlers.handleModelError(err, res);
  });
};

exports.getOrder = (req, res) => {
  let orderId = req.params.id;
  let seller = req.user;

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
      },
      {
        model: User,
        attributes: ['id', 'fullName', 'avatar']
      },
      {
        model: OrderLine,
        attributes: ['item', 'note', 'quantity']
      }
    ]
  }).then(o => {
    if (!o) {
      let error = 'Order does not exits';
      return Promise.reject({status: 404, message: error, type: 'model'});
    }

    res.json(processOrderData(o));
  }).catch(err => {
    if (err.status) {
      errorHandlers.responseError(err.status, err.message, err.type, res);
    } else {
      errorHandlers.handleModelError(err, res);
    }
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

var processOrderData = (o) => {
  let order = o.toJSON();
  let orderLines = _.map(order.OrderLines, r => _.pick(r, ['item', 'note', 'quantity']));
  order.orderLines = orderLines;
  order.user = order.User;
  delete order.User;
  delete order.Shop;
  delete order.userId;
  delete order.OrderLines;
  return order;
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
      },
      {
        model: User,
        attributes: ['id', 'fullName', 'avatar']
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
          status: 400,
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

    result.user = result.User;
    delete result.User;
    delete result.Shop;
    delete result.userId;

    res.json(result);
  });
};
