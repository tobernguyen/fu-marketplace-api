'use strict';

const USER_UPDATE_VALID_KEY = ['fullName', 'room', 'phone', 'gender', 'identityNumber'];
const ADMIN_UPDATE_VALID_KEY = USER_UPDATE_VALID_KEY.concat(['role', 'banned']);

var User = require('../models').User;
var _ = require('lodash');
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

exports.adminGetAll = (req, res) => {
  User.findAll().then(users => {
    res.json({
      users: users
    });
  });
};

exports.adminUpdateUserProfile = (req, res) => {
  var userId = req.params.id;
  
  User.findById(userId).then(user => {
    if (!user){
      res.status(404);
      res.json({
        status: 404,
        error: 'User is not exits'
      });
    } else{
      sanitizeUpdateRequest(req, true);
      user.update(getUpdateParams(req, true)).then(user => {
        res.json(user);
      }).catch(err => {
        errorHandlers.modelErrorHandler(err, res);
      });
    }
  });
};

exports.adminGetUser = (req, res) => {
  var userId = req.params.id;
  
  User.findById(userId).then(user => {
    if (!user){
      res.status(404);
      res.json({
        status: 404,
        error: 'User is not exits'
      });
    } else{
      res.json(user);
    }
  });
};

exports.putCurrentUser = (req, res) =>{
  sanitizeUpdateRequest(req, false);
  req.user.update(getUpdateParams(req, false)).then(user => {
    res.json(user);
  }).catch(err => {
    errorHandlers.modelErrorHandler(err, res);
  });
};

var sanitizeUpdateRequest = (req, isAdmin) => {
  let updateValidKey = (isAdmin) ? ADMIN_UPDATE_VALID_KEY : USER_UPDATE_VALID_KEY;
  updateValidKey.forEach(k => {
    req.sanitize(k).escape();
    req.sanitize(k).trim();
  });
}; 

var getUpdateParams = (req, isAdmin) => {
  let updateValidKey = (isAdmin) ? ADMIN_UPDATE_VALID_KEY : USER_UPDATE_VALID_KEY;
  let updateInfo = _.pick(req.body, updateValidKey);
  
  if (updateInfo.phone){
    updateInfo.phone = updateInfo.phone.replace(/\D/g,''); // accept only numberic
  } 
 
  if (updateInfo.identityNumber){
    updateInfo.identityNumber = updateInfo.identityNumber.replace(/\D/g,'');
  }
  return updateInfo;
};