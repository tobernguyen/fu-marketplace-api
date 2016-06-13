'use strict';

var _ = require('lodash');
var userUpdateNormalizer = require('./helpers/userUpdateNormalizer');
var sanitizeUpdateRequest = userUpdateNormalizer.sanitizeUpdateRequest;
var getUpdateParams = userUpdateNormalizer.getUpdateParams;
var errorHandlers = require('./helpers/errorHandlers');
var imageUploader = require('../libs/image-uploader');
var User = require('../models').User;
var ShopOpeningRequest = require('../models').ShopOpeningRequest;
var crypto = require('crypto');

exports.getCurrentUser = (req, res) => {
  let result = req.user.toJSON();
  req.user.getRoles().then(roles => {
    let roleNames = _.map(roles, r => r.name);
    if (roleNames.length > 0) result['roles'] = roleNames;
    res.json(result);
  });
};

exports.postSignOutAll = (req, res) => {
  req.user.signOutAll().then(() => {
    res.json({
      status: 200
    });
  });
};

exports.putCurrentUser = (req, res) => {
  sanitizeUpdateRequest(req, false);
  req.user.update(getUpdateParams(req, false)).then(user => {
    let result = user.toJSON();
    user.getRoles().then(roles => {
      let roleNames = _.map(roles, r => r.name);
      if (roleNames.length > 0) result['roles'] = roleNames; 
      res.json(result);
    });
  }).catch(err => {
    errorHandlers.handleModelError(err, res);
  });
};

exports.postUploadCurrentUserAvatar = (req, res) => {
  imageUploader.useMiddlewareWithConfig({
    maxFileSize: User.MAXIMUM_AVATAR_SIZE,
    versions: [
      {
        resize: '100x100',
        crop: '100x100',
        quality: 90,
        suffix: 'small',
        fileName: `users/${req.user.id}/avatar`
      },
      {
        resize: '250x250',
        crop: '250x250',
        quality: 90,
        suffix: 'medium',
        fileName: `users/${req.user.id}/avatar`
      }
    ]
  })(req, res, data => {
    req.user.update({
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
      res.json(user);
    });
  });
};


exports.postRequestOpenShopFirstTime = (req, res) => {
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

  // Return error if user didn't upload identity photo
  if (!(user.identityPhotoFile && _.isArray(user.identityPhotoFile.versions) && user.identityPhotoFile.versions.length > 0)) {
    res.status(400);
    res.json({
      status: 400,
      errors: {
        'sellerInfo.identityPhoto': {
          message: 'Identity photo must be present',
          message_code: 'error.form_validation.identity_photo_must_be_present'
        }
      }
    });
    return;
  }
  
  let sellerInfo = req.body.sellerInfo;
  let shopInfo = req.body.shopInfo;
  let note = req.body.note || '';

  validateRequestOpeningShopFirstTime(user).then(() => {
    return user.update({
      phone: sellerInfo.phone,
      identityNumber: sellerInfo.identityNumber
    });
  }).then(() => {
    return ShopOpeningRequest.create({
      name: shopInfo.name,
      description: shopInfo.description,
      address: shopInfo.address,
      ownerId: user.id,
      note: note
    });
  }).then((shopOpeningRequest) => {
    res.json({
      sellerInfo: _.assign(sellerInfo, {identityPhoto: user.identityPhotoFile.versions[0].Url}),
      shopInfo: _.pick(shopOpeningRequest.toJSON(), ['name', 'description', 'address', 'note']),
      note: shopOpeningRequest.note || ''
    });
  }).catch(error => {
    if (error === 'already_seller') {
      errorHandlers.responseError(400, 'Already seller', 'open_shop_request', res);
    } else if (error === 'already_requested') {
      errorHandlers.responseError(400, 'A pending request is existed', 'open_shop_request', res);
    } else {
      errorHandlers.handleModelError(error, res);
    }
  });
};

exports.postUserUploadIdentityPhoto = (req, res) => {
  let user = req.user;
  let identityFileHash = crypto.createHash('sha1').update(user.id.toString()).digest('hex');

  user.verifyRole('seller').then(isSeller => {
    if (isSeller) {
      res.status(403);
      res.json({
        status: 403,
        message: 'Seller is not allowed to change identity photo',
        message_code: 'errors.seller.change_identity_photo_not_allowed'
      });
    } else {
      imageUploader.useMiddlewareWithConfig({
        maxFileSize: User.MAXIMUM_IDENTITY_PHOTO_SIZE,
        versions: [
          {
            quality: 80,
            fileName: `users/${req.user.id}/identity-${identityFileHash}`
          }
        ]
      })(req, res, data => {
        req.user.update({
          identityPhotoFile: {
            versions: _.map(data, image => {
              return {
                Url: image.Location,
                Key: image.Key
              };
            })
          }
        }).then(user => {
          res.json({
            identityPhoto: data[0].Location
          });
        });
      });
    }
  });
};

exports.getShopOpeningRequests = (req, res) => {
  ShopOpeningRequest.findAll({
    where: {
      ownerId: req.user.id,
      status: ShopOpeningRequest.STATUS.PENDING
    }
  }).then(requests => {
    let result = _.map(requests, r => {
      let result = r.toJSON();
      delete r['ownerId'];
      return result;
    });

    res.json({
      shopOpeningRequests: result
    });
  });
};

var validateRequestOpeningShopFirstTime = (user) => {
  return user.verifyRole('seller').then(isSeller => {
    return isSeller ? Promise.reject('already_seller') : Promise.resolve();
  }).then(() => {
    return ShopOpeningRequest.findOne({
      where: {
        ownerId: user.id,
        status: ShopOpeningRequest.STATUS.PENDING
      }
    });
  }).then(shopOpeningRequests => {
    if (shopOpeningRequests) {
      return Promise.reject('already_requested');
    } else {
      return Promise.resolve();
    }
  });
};

const REQUEST_OPEN_SHOP_BODY_SCHEMA = {
  'sellerInfo.phone': {
    notEmpty: {
      errorMessage: 'Must not be empty'
    },
    isNumeric: {
      errorMessage: 'Must be a number'
    }
  },
  'sellerInfo.identityNumber': {
    notEmpty: {
      errorMessage: 'Must not be empty'
    },
    isNumeric: {
      errorMessage: 'Must be a number'
    },
    isLength: {
      options: [{min: 9, max: 12}],
      errorMessage: 'Must be 9 or 12 characters'
    }
  },
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
  }
};
