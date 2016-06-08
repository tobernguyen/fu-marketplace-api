'use strict';

var _ = require('lodash');
var userUpdateNormalizer = require('./helpers/userUpdateNormalizer');
var sanitizeUpdateRequest = userUpdateNormalizer.sanitizeUpdateRequest;
var getUpdateParams = userUpdateNormalizer.getUpdateParams;
var errorHandlers = require('./helpers/errorHandlers');
var imageUploader = require('../libs/image-uploader');
var User = require('../models').User;

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
