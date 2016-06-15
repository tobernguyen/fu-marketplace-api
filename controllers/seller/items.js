'use strict';

var _ = require('lodash');
var models = require('../../models');
var errorHandlers = require('../helpers/errorHandlers');
var Item = models.Item;
var Shop = models.Shop;

exports.getItems = (req, res) => {
  let shopId = req.params.shopId;
  
  let seller = req.user;

  Shop.findOne({
    where: {
      id: shopId,
      ownerId: seller.id
    },
    include: Item
  }).then((shop) => {
    if (!shop) {
      let error = 'Shop does not exist';
      errorHandlers.responseError(404, error, 'model', res);
      return;
    }

    let items = _.map(shop.Items, item => item.toJSON());
    res.json({
      items: items
    });  
  });
};

exports.postItems = (req, res) => {
  let shopId = req.params.shopId;
  let seller = req.user;

  Shop.findOne({
    where: {
      id: shopId,
      ownerId: seller.id
    }
  }).then(shop => {
    if (!shop) {
      let error ='Shop does not exist';
      errorHandlers.responseError(404, error, 'model', res);
      return;
    }


  });
};