'use strict';

var _ = require('lodash');
var errorHandlers = require('./helpers/errorHandlers');
var models = require('../models');
var User = models.User;
var Shop = models.Shop;
var ShipPlace = models.ShipPlace;
var Item = models.Item;

exports.getShop = (req, res) => {
  let shopId = req.params.shopId;
  responseShopById(shopId, res);
};

exports.postReviewShop = (req, res) => {
  let shopId = req.params.shopId;
  let user = req.user;

  let reviewInfo = _.pick(req.body, ['rate', 'comment']);
  reviewInfo.userId = user.id;
  Shop.findById(shopId).then(s => {
    if (!s || s.banned) {
      let error = 'Shop does not exist';
      return Promise.reject({status: 404, message: error, type: 'model'});
    } else {
      return s.review(reviewInfo);
    }
  }).then(review => {
    res.json(review.toJSON());
  }).catch(err => {
    if (err.status) {
      errorHandlers.responseError(err.status, err.message, err.type, res);
    } else {
      errorHandlers.handleModelError(err, res);
    }
  });
};

var responseShopById = (shopId, res) => {
  Shop.findOne({
    where: {
      id: shopId,
      banned: {
        $not: true
      }
    },
    include: [
      ShipPlace,
      {
        model: User,
        attributes: ['fullName', 'phone', 'avatar']
      },
      {
        model: Item,
        where: { status: Item.STATUS.FOR_SELL },
        required: false
      }
    ],
    order: [
      'sort',
      'id'
    ]
  }).then(shop => {
    if (!shop) {
      let error = 'Shop does not exist';
      errorHandlers.responseError(404, error, 'model', res);
    } else {
      let result = shop.toJSON();
      let shipPlace = _.map(shop.ShipPlaces, sp => sp.id);
      let items = _.map(shop.Items, i => {
        let item = i.get();
        delete item['imageFile'];
        return item;
      });
      let sellerInfo = shop.User;
      result['shipPlaces'] = shipPlace;
      result['seller'] = sellerInfo;
      result['items'] = items;
      delete result['ShipPlaces'];
      delete result['User'];
      delete result['Items'];
      res.json(result);
    }
  });
};
exports.responseShopById = responseShopById;