'use strict';

const User = require('../models').User;
const _ = require('lodash');

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
