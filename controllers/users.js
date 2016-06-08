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
  let user = req.user;

  req.checkBody(REQUEST_OPEN_SHOP_BODY_SCHEMA);

  //handle validate by schema
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
      sellerInfo: _.assign(sellerInfo, {identityPhoto: user.identityPhotoFile.versions[0].Url}),  // DOAN NAY KO CHAC LOGIC LAM
      shopInfo: _.pick(shopOpeningRequest.toJSON(), ['name', 'description', 'address', 'note'])
    });
  }).catch(error => {
    if (error === 'already_seller') {
      errorHandlers.responseError(400, 'Already seller', 'open_shop_request', res);
    } else if (error === 'already_requested') {
      errorHandlers.responseError(400, 'A pending request is existed', 'open_shop_request', res);
    }
  });
};

exports.uploadIdentityPhoto = (req, res) => {
  //TBD
};

var validateRequestOpeningShopFirstTime = (user) => {
  return user.getRoles().then(roles => {
    let roleNames = _.map(roles, r => r.name);
    if (!_.includes(roleNames, 'seller')) {
      return Promise.resolve();
    } else {
      return Promise.reject('already_seller');
    }
  }).then(() => {
    return ShopOpeningRequest.find({
      where: {
        ownerId: user.id,
        status: {
          $in: [ShopOpeningRequest.STATUS.PENDING, ShopOpeningRequest.STATUS.ACCEPTED]
        }
      }
    });
  }).then(shopOpeningRequests => {
    if (shopOpeningRequests.length > 0) {
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
