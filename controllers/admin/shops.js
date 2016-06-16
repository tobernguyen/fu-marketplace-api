'use strict';

var _ = require('lodash');
var models = require('../../models');
var ShipPlace = models.ShipPlace;
var Shop = models.Shop;
var User = models.User;
var errorHandlers = require('../helpers/errorHandlers');
var shopUpdateNormalizer = require('../helpers/shopUpdateNormalizer');
var sanitizeUpdateRequest = shopUpdateNormalizer.sanitizeUpdateRequest;
var getUpdateParams = shopUpdateNormalizer.getUpdateParams;
var imageUploader = require('../../libs/image-uploader');

exports.getShops = (req, res) => {
  Shop.findAll({
    include: [
      ShipPlace,
      User
    ]
  }).then(shops => {
    let result = _.map(shops, s => {
      let shop = s.toJSON();
      let shipPlaces = _.map(shop.ShipPlaces, s => s.id);
      shop['shipPlaces'] = shipPlaces;
      let sellerInfo = s.User.getBasicSellerInfo();
      delete shop['ShipPlaces'];
      delete shop['User'];
      shop['seller'] = sellerInfo;
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
    
  Shop.findById(shopId).then(shop => {
    if (!shop){
      errorHandlers.responseError(404, 'Shop does not exits', 'model', res);
    } else{
      sanitizeUpdateRequest(req, true);
      shop.update(getUpdateParams(req, true))
        .then(shop => responseShopById(shop.id, res))
        .catch(err => errorHandlers.handleModelError(err, res));
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
          responseShopById(shop.id, res);
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
          responseShopById(shop.id, res);
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
          responseShopById(shop.id, res);
        }).catch(err => {
          errorHandlers.handleModelError(err, res);
        });
      }
    });
  }
};

var responseShopById = (id, res) => {
  Shop.findOne({
    where: {
      id: id
    },
    include: [
      ShipPlace,
      User
    ]
  }).then(shop => {
    if (!shop) {
      let error = 'Shop does not exits';
      errorHandlers.responseError(404, error, 'model', res);
    } else {
      let result = shop.toJSON();
      let shipPlace = _.map(shop.ShipPlaces, sp => sp.id);
      let sellerInfo = shop.User.getBasicSellerInfo();
      result['shipPlaces'] = shipPlace;
      delete result['ShipPlaces'];
      delete result['User'];
      result['seller'] = sellerInfo;
      res.json(result);      
    }
  });
};
