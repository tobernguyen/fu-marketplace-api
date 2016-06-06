'use strict';

var _ = require('lodash');
var models = require('../../models');
var ShipPlace = models.ShipPlace;
var Shop = models.Shop;

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
      if (shipPlaces.length > 0) shop['shipPlaces'] = shipPlaces;
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

var responseShopById = (id, res) => {
  Shop.findById(id).then(shop => {
    if (!shop){
      res.status(404);
      let error = 'Shop is not exits';
      res.json({
        status: 404,
        error: error,
        message_code: `error.model.${_.snakeCase(error)}`
      });
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
    if (shipPlace.length > 0) result['shipPlaces'] = shipPlace;
    res.json(result);
  });
};