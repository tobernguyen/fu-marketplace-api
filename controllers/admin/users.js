'use strict';

var _ = require('lodash');
var models = require('../../models');
var User = models.User;
var Role = models.Role;
var userUpdateNormalizer = require('../helpers/userUpdateNormalizer');
var sanitizeUpdateRequest = userUpdateNormalizer.sanitizeUpdateRequest;
var getUpdateParams = userUpdateNormalizer.getUpdateParams;
var errorHandlers = require('../helpers/errorHandlers');

exports.getUsers = (req, res) => {
  User.findAll({
    include: Role
  }).then(users => {
    let result = _.map(users, u => {
      let user = u.toJSON();
      let roleNames = _.map(user.Roles, r => r.name);
      delete user.Roles;
      if (roleNames.length > 0) user['roles'] = roleNames;
      return user;
    });
    res.json({
      users: result
    });
  });
};

exports.putUser = (req, res) => {
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
        let result = user.toJSON();
        user.getRoles().then(roles => {
          let roleNames = _.map(roles, r => r.name);
          if (roleNames.length > 0) result['roles'] = roleNames;
          res.json(result);
        });
      }).catch(err => {
        errorHandlers.modelErrorHandler(err, res);
      });
    }
  });
};

exports.getUser = (req, res) => {
  let userId = req.params.id;
  responseUserById(userId, res);
};

exports.postSetRoles = (req, res) => {
  let userId = req.params.id;
  
  let roles = req.body.roles;
  
  if (!roles) {
    res.status(422);
    res.json({
      status: 422,
      error: 'Roles must be an array'
    });
  } else {
    let user;
    User.findById(userId).then(u => {
      if (!u){
        res.status(404);
        res.json({
          status: 404,
          error: 'User is not exits'
        });
      } else{
        user = u;
        if (roles.length == 0){
          return Promise.resolve([]);
        } else {
          return Role.findAll({
            where: {
              name: {
                $in: roles
              }
            }
          });
        }
      }
    }).then(r => {
      if (r.length > 0 || roles.length == 0){
        return user.setRoles(r);
      } else {
        return Promise.resolve();
      }
    }).then(() => {
      responseUser(user, res);
    }).catch(err => {
      errorHandlers.modelErrorHandler(err, res);
    });
  }
};

var responseUserById = (id, res) => {
  User.findById(id).then(user => {
    if (!user){
      res.status(404);
      res.json({
        status: 404,
        error: 'User is not exits'
      });
    } else {
      responseUser(user, res);
    }
  });
};

var responseUser = (user, res) => {
  let result = user.toJSON();
  user.getRoles().then(roles => {
    let roleNames = _.map(roles, r => r.name);
    if (roleNames.length > 0) result['roles'] = roleNames;
    res.json(result);
  });
};