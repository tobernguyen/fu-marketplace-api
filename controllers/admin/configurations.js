'use strict';

var Configuration = require('../../models').Configuration;
var _ = require('lodash');
var validator = require('validator');
var errorHandlers = require('../helpers/errorHandlers');

exports.getShopRequestMailingList = (req, res) => {
  Configuration.get(Configuration.KEYS.SHOP_REQUEST_MAILING_LIST).then(con => {
    let result;

    if (!con) result = [];
    else result = con;

    res.json({
      shopRequestMailingList: result
    });
  });
};

exports.postShopRequestMailingList = (req, res) => {
  let shopRequestMailingList = req.body.shopRequestMailingList;

  if (!_.isArray(shopRequestMailingList) || shopRequestMailingList.length < 1)
    return errorHandlers.responseError(
      400,
      'Invalid request',
      'configuration',
      res
    );

  let isValidEmailList = shopRequestMailingList.every(el => {
    return validator.isEmail(el);
  });

  if (!isValidEmailList)
    return errorHandlers.responseError(
      400,
      'Invalid email address',
      'configuration',
      res
    );

  Configuration.set(Configuration.KEYS.SHOP_REQUEST_MAILING_LIST, shopRequestMailingList)
    .then(() => {
      res.json({
        shopRequestMailingList: shopRequestMailingList
      });
    });
};
