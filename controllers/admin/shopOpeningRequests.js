'use strict';

var _ = require('lodash');
var models = require('../../models');
var ShopOpeningRequest = models.ShopOpeningRequest;
var User = models.User;

exports.getShopOpeningRequests = (req, res) => {
  let shopOpeningRequestQuery;

  if (req.query.showAll) {
    shopOpeningRequestQuery = ShopOpeningRequest;
  } else {
    shopOpeningRequestQuery = ShopOpeningRequest.scope('pending');
  }

  shopOpeningRequestQuery.findAll({
    include: User
  }).then(shops => {
    let result = _.map(shops, s => {
      let shop = s.toJSON();
      let sellerInfo = s.User.getBasicSellerInfo();
      delete shop['User'];
      shop['seller'] = sellerInfo;
      return shop;
    });

    res.json({
      shopOpeningRequests: result
    });
  });
};
