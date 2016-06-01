'use strict';

const User = require('../models').User;

const USER_UPDATE_VALID_KEY = ['fullName', 'room', 'phone', 'gender', 'identityNumber'];

var _ = require('lodash');

exports.getCurrentUser = (req, res) => {
  res.json(req.user);
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

exports.putCurrentUser = (req, res) =>{
  USER_UPDATE_VALID_KEY.forEach(k => {
    req.sanitize(k).escape();
    req.sanitize(k).trim();
  })
  let updateInfo = _.pick(req.body, USER_UPDATE_VALID_KEY);
  if (updateInfo.phone){
    updateInfo.phone = updateInfo.phone.replace(/\D/g,''); // accept only numberic
  }
  if (updateInfo.identityNumber){
    updateInfo.identityNumber = updateInfo.identityNumber.replace(/\D/g,'');
  }
  
  req.user.update(updateInfo).then(resUser => {
    res.json(resUser);
  }).catch(function(err) {
    if (err.statusCode) {
      res.status(err.statusCode);
    } else {
      res.status(500);
    }
    res.json({'error': err.message});
  });
}