'use strict';

var _ = require('lodash');
var models = require('../../models');
var ShipPlace = models.ShipPlace;
var Shop = models.Shop;
var errorHandlers = require('../helpers/errorHandlers');
var shopUpdateNormalizer = require('../helpers/shopUpdateNormalizer');
var sanitizeUpdateRequest = shopUpdateNormalizer.sanitizeUpdateRequest;
var getUpdateParams = shopUpdateNormalizer.getUpdateParams;

exports.getShops = (req, res) => {
  Shop.findAll({
    include: ShipPlace
  }).then(shops => {
    let result = _.map(shops, s => {
      let shop = s.toJSON();
      let shipPlaces = _.map(shop.ShipPlaces, function(s) {
        return {
          id: s.id,
          name: s.name
        };
      });
      delete shop.ShipPlaces;
      shop['shipPlaces'] = shipPlaces;
      return shop;
    });
    res.json({
      shops: result
    });
  });
};

exports.getShop = (req, res) => {
  let shopId = req.params.id;
  responseShopById(shopId, res);
};

exports.putShop = (req, res) => {
  var shopId = req.params.id;
    
  Shop.findById(shopId).then(Shop => {
    if (!Shop){
      errorHandlers.responseError(404, 'Shop does not exits', 'model', res);
    } else{
      sanitizeUpdateRequest(req, true);
      Shop.update(getUpdateParams(req, true)).then(shop => {
        responseShop(shop, res);
      }).catch(err => {
        errorHandlers.modelErrorHandler(err, res);
      });
    }
  });
};

var responseShopById = (id, res) => {
  Shop.findById(id).then(shop => {
    if (!shop) {
      let error = 'Shop does not exits';
      errorHandlers.responseError(404, error, 'model', res);
    } else {
      responseShop(shop, res);
    }
  });
};

var responseShop = (shop, res) => {
  let result = shop.toJSON();
  shop.getShipPlaces().then(shipPlaces => {
    let shipPlace = _.map(shipPlaces, function(sp) {
      return {
        id: sp.id,
        name: sp.name
      };
    });
    result['shipPlaces'] = shipPlace;
    res.json(result);
  });
};