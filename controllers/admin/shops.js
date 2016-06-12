'use strict';

var _ = require('lodash');
var models = require('../../models');
var ShipPlace = models.ShipPlace;
var Shop = models.Shop;
var errorHandlers = require('../helpers/errorHandlers');
var shopUpdateNormalizer = require('../helpers/shopUpdateNormalizer');
var sanitizeUpdateRequest = shopUpdateNormalizer.sanitizeUpdateRequest;
var getUpdateParams = shopUpdateNormalizer.getUpdateParams;
var imageUploader = require('../../libs/image-uploader');

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
        errorHandlers.handleModelError(err, res);
      });
    }
  });
};

exports.postShopUploadAvatar = (req, res) => {
  let shopId = req.params.id;

  Shop.findById(shopId).then(shop => {
    if (!shop) {
      let error = 'Shop does not exits';
      errorHandlers.responseError(404, error, 'model', res);
    } else {
      imageUploader.useMiddlewareWithConfig({
        maxFileSize: Shop.MAXIMUM_AVATAR_SIZE,
        versions: [
          {
            resize: '200x200',
            crop: '200x200',
            quality: 90,
            fileName: `shops/${shop.id}/avatar`
          }
        ]
      })(req, res, data => {
        shop.update({
          avatar: data[0].Location, // Save the url of first image version to avatar field
          avatarFile: {
            versions: _.map(data, image => {
              return {
                Url: image.Location,
                Key: image.Key
              };
            })
          }
        }).then(user => {
          responseShop(shop, res);
        });
      });
    }
  });
};

exports.postShopUploadCover = (req, res) => {
  let shopId = req.params.id;

  Shop.findById(shopId).then(shop => {
    if (!shop) {
      let error = 'Shop does not exits';
      errorHandlers.responseError(404, error, 'model', res);
    } else {
      imageUploader.useMiddlewareWithConfig({
        maxFileSize: Shop.MAXIMUM_COVER_SIZE,
        versions: [
          {
            resize: '900x400',
            crop: '900x400',
            quality: 90,
            fileName: `shops/${shop.id}/cover`
          }
        ]
      })(req, res, data => {
        shop.update({
          cover: data[0].Location, // Save the url of first image version to avatar field
          coverFile: {
            versions: _.map(data, image => {
              return {
                Url: image.Location,
                Key: image.Key
              };
            })
          }
        }).then(user => {
          responseShop(shop, res);
        });
      });
    }
  });
};

exports.postChangeShopShipPlaces = (req, res) => {
  let shopId = req.params.id;
  let shipPlaces = req.body.shipPlaces;
  if (!shipPlaces || !_.isArray(shipPlaces)){
    let error = 'Must provide shipPlaces';
    errorHandlers.responseError(422, error, 'param', res);
  } else {
    Shop.findById(shopId).then(shop => {
      if (!shop) {
        let error = 'Shop does not exits';
        errorHandlers.responseError(404, error, 'model', res);
      } else {
        ShipPlace.findAll({
          where: {
            id: {
              $in: shipPlaces
            }
          }
        }).then(sp => {
          return shop.setShipPlaces(sp);
        }).then(s => {
          responseShop(shop, res);
        }).catch(err => {
          errorHandlers.handleModelError(err, res);
        });
      }
    });
  }
};

exports.getShopShipPlaces = (req, res) => {
  let shopId = req.params.id;
  
  Shop.findById(shopId).then(shop => {
    if (!shop) {
      let error = 'Shop does not exits';
      errorHandlers.responseError(404, error, 'model', res);
    } else {
      shop.getShipPlaces().then(shipPlaces => {
        let shipPlace = _.map(shipPlaces, function(sp) {
          return {
            id: sp.id,
            name: sp.name
          };
        });
        res.json({
          shipPlaces: shipPlace
        });
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