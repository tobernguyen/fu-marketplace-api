const User = require('../models').User;

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
