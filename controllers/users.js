'use strict';

var _ = require('lodash');
var userUpdateNormalizer = require('./helpers/userUpdateNormalizer');
var sanitizeUpdateRequest = userUpdateNormalizer.sanitizeUpdateRequest;
var getUpdateParams = userUpdateNormalizer.getUpdateParams;
var errorHandlers = require('./helpers/errorHandlers');

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
    errorHandlers.modelErrorHandler(err, res);
  });
};