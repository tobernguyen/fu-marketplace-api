'use strict';

var _ = require('lodash');
var models = require('../../models');
var ShipPlace = models.ShipPlace;
var Shop = models.Shop;
var ShopOpeningRequest = models.ShopOpeningRequest;
var errorHandlers = require('../helpers/errorHandlers');
var shopUpdateNormalizer = require('../helpers/shopUpdateNormalizer');
var sanitizeUpdateRequest = shopUpdateNormalizer.sanitizeUpdateRequest;
var getUpdateParams = shopUpdateNormalizer.getUpdateParams;
var imageUploader = require('../../libs/image-uploader');

exports.getShops = (req, res) => {
  let seller = req.user;

  seller.getShops({
    include: ShipPlace
  }).then(shops => {
    let result = _.map(shops, s => {
      let shop = s.toJSON();
      let shipPlaces = _.map(shop.ShipPlaces, s => s.id);
      delete shop.ShipPlaces;
      shop['shipPlaces'] = shipPlaces;
      return shop;
    });
    res.json({
      shops: result
    });
  }).catch(err => {
    res.json(err);
  });
};

exports.getShop = (req, res) => {
  let shopId = req.params.id;
  responseShopById(req.user, shopId, res);
};

exports.putShop = (req, res) => {
  var shopId = req.params.id;
  let seller = req.user;

  seller.getShops({
    where: {
      id: shopId
    }
  }).then(shops => {
    if (shops.length != 1){
      let error = 'Shop does not exist';
      errorHandlers.responseError(404, error, 'model', res);
    } else {
      let shop = shops[0];
      let banned = shop.banned || false;
      if (banned) {
        let error = 'Cannot update info for banned shop';
        errorHandlers.responseError(403, error, 'banned', res);
      } else {
        sanitizeUpdateRequest(req, false);
        shop.update(getUpdateParams(req, false)).then(shop => {
          responseShop(shop, res);
          return null;
        }).catch(err => {
          errorHandlers.handleModelError(err, res);
        });
      }
    }
  });
};

exports.postShopUploadAvatar = (req, res) => {
  var shopId = req.params.id;
  let seller = req.user;

  seller.getShops({
    where: {
      id: shopId
    }
  }).then(shops => {
    if (shops.length != 1){
      let error = 'Shop does not exist';
      errorHandlers.responseError(404, error, 'model', res);
    } else {
      let shop = shops[0];
      let banned = shop.banned || false;
      if (banned) {
        let error = 'Cannot update avatar for banned shop';
        errorHandlers.responseError(403, error, 'banned', res);
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
            avatar: `${data[0].Location}?${new Date().getTime()}`, // Save the url of first image version to avatar field, add timestamp to avoid caching
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
    }
  });
};

exports.postShopUploadCover = (req, res) => {
  var shopId = req.params.id;
  let seller = req.user;

  seller.getShops({
    where: {
      id: shopId
    }
  }).then(shops => {
    if (shops.length != 1){
      let error = 'Shop does not exist';
      errorHandlers.responseError(404, error, 'model', res);
    } else {
      let shop = shops[0];
      let banned = shop.banned || false;
      if (banned) {
        let error = 'Cannot update cover for banned shop';
        errorHandlers.responseError(403, error, 'banned', res);
      } else {
        imageUploader.useMiddlewareWithConfig({
          maxFileSize: Shop.MAXIMUM_COVER_SIZE,
          versions: [
            {
              resize: '850x250',
              crop: '850x250',
              quality: 90,
              fileName: `shops/${shop.id}/cover`
            }
          ]
        })(req, res, data => {
          shop.update({
            cover: `${data[0].Location}?${new Date().getTime()}`, // Save the url of first image version to avatar field, add timestamp to avoid caching
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
    }
  });
};

exports.postChangeShopShipPlaces = (req, res) => {
  var shopId = req.params.id;
  let seller = req.user;
  let shipPlaces = req.body.shipPlaces;
  if (!shipPlaces || !_.isArray(shipPlaces)){
    let error = 'Must provide shipPlaces';
    errorHandlers.responseError(422, error, 'param', res);
  } else {
    seller.getShops({
      where: {
        id: shopId
      }
    }).then(shops => {
      if (shops.length != 1){
        let error = 'Shop does not exist';
        errorHandlers.responseError(404, error, 'model', res);
      } else {
        let shop = shops[0];
        let banned = shop.banned || false;
        if (banned) {
          let error = 'Cannot update shipPlace for banned shop';
          errorHandlers.responseError(403, error, 'banned', res);
        } else {
          ShipPlace.findAll({
            where: {
              id: {
                $in: shipPlaces
              }
            }
          }).then(sp => {
            return shop.setShipPlacesThenUpdateIndex(sp);
          }).then(s => {
            responseShop(shop, res);
            return null;
          }).catch(err => {
            errorHandlers.handleModelError(err, res);
          });
        }
      }
    });
  }
};

exports.postRequestOpenShop = (req, res) => {
  req.checkBody(REQUEST_OPEN_SHOP_BODY_SCHEMA);

  var errs = req.validationErrors();

  if (errs) {
    let errors = {};
    errs.forEach(err => {
      errors[err.param] = {
        message: err.msg,
        message_code: `error.form_validation.${_.snakeCase(err.msg)}`
      };
    });
    res.status(400);
    res.json({
      status: 400,
      errors: errors
    });
    return;
  }

  let user = req.user;
  let sellerInfo = {
    phone: user.phone,
    identityNumber: user.identityNumber
  };
  let shopInfo = req.body.shopInfo;
  let note = req.body.note || '';

  validateRequestOpeningShop(user).then(() => {
    return ShopOpeningRequest.create({
      name: shopInfo.name,
      description: shopInfo.description,
      address: shopInfo.address,
      phone: shopInfo.phone,
      ownerId: user.id,
      note: note
    });
  }).then((shopOpeningRequest) => {
    res.json({
      sellerInfo: _.assign(sellerInfo, {identityPhoto: user.identityPhotoFile.versions[0].Url}),
      shopInfo: _.pick(shopOpeningRequest.toJSON(), ['name', 'description', 'address', 'note', 'phone']),
      note: shopOpeningRequest.note || ''
    });
  }).catch(error => {
    if (error === 'already_requested') {
      errorHandlers.responseError(400, 'A pending request is existed', 'open_shop_request', res);
    } else {
      errorHandlers.handleModelError(error, res);
    }
  });
};

var validateRequestOpeningShop = (user) => {
  return ShopOpeningRequest.findOne({
    where: {
      ownerId: user.id,
      status: ShopOpeningRequest.STATUS.PENDING
    }
  }).then(shopOpeningRequests => {
    if (shopOpeningRequests) {
      return Promise.reject('already_requested');
    } else {
      return Promise.resolve();
    }
  });
};

var responseShopById = (owner, id, res) => {
  Shop.findOne({
    where: {
      id: id,
      ownerId: owner.id
    },
    include: ShipPlace
  }).then((shop) => {
    if (!shop) {
      let error = 'Shop does not exist';
      errorHandlers.responseError(404, error, 'model', res);
    } else {
      let result = shop.toJSON();
      let shipPlace = _.map(shop.ShipPlaces, sp => sp.id);
      result['shipPlaces'] = shipPlace;
      delete result.ShipPlaces;
      res.json(result);      
    }
  });
};

var responseShop = (shop, res) => {
  let result = shop.toJSON();
  shop.getShipPlaces().then(shipPlaces => {
    let shipPlace = _.map(shipPlaces, sp => sp.id);
    result['shipPlaces'] = shipPlace;
    delete result.ShipPlaces;
    res.json(result);
  });
};

const REQUEST_OPEN_SHOP_BODY_SCHEMA = {
  'shopInfo.name': {
    notEmpty: {
      errorMessage: 'Must not be empty'
    },
    isLength: {
      options: [{max: 50}]
    }
  },
  'shopInfo.description': {
    notEmpty: {
      errorMessage: 'Must not be empty'
    },
    isLength: {
      options: [{max: 255}],
      errorMessage: 'Too long. Maximum is 255 characters.'
    }
  },
  'shopInfo.address': {
    notEmpty: {
      errorMessage: 'Must not be empty'
    }
  },
  'shopInfo.phone': {
    notEmpty: {
      errorMessage: 'Must not be empty'
    }
  }
};

exports.getSalesStatistic = (req, res) => {
  let seller = req.user;
  let shopId = req.params.id;

  seller.getShops({
    where: {
      id: shopId
    }
  }).then(shops => {
    if (shops.length !== 1) return errorHandlers.responseError(404, 'Shop does not exist', 'model', res);

    shops[0].getSalesStatistic().then(salesStatistic => {
      res.json({
        salesStatistic: {
          updatedAt: new Date(),
          data: salesStatistic
        }
      });

      return null;
    });
  });
};

exports.getOrdersStatistic = (req, res) => {
  let seller = req.user;
  let shopId = req.params.id;

  seller.getShops({
    where: {
      id: shopId
    }
  }).then(shops => {
    if (shops.length !== 1) return errorHandlers.responseError(404, 'Shop does not exist', 'model', res);

    shops[0].getOrdersStatistic().then(ordersStatistic => {
      res.json({
        ordersStatistic: {
          updatedAt: new Date(),
          data: ordersStatistic
        }
      });

      return null;
    });
  });
};

exports.getItemSoldStatistic = (req, res) => {
  let seller = req.user;
  let shopId = req.params.id;

  seller.getShops({
    where: {
      id: shopId
    }
  }).then(shops => {
    if (shops.length !== 1) return errorHandlers.responseError(404, 'Shop does not exist', 'model', res);

    shops[0].getItemSoldStatistic().then(itemSoldStatistic => {
      res.json({
        itemSoldStatistic: {
          updatedAt: new Date(),
          data: itemSoldStatistic
        }
      });

      return null;
    });
  });
};
