'use strict';

var _ = require('lodash');
var models = require('../../models');
var User = models.User;
var Role = models.Role;
var userUpdateNormalizer = require('../helpers/userUpdateNormalizer');
var sanitizeUpdateRequest = userUpdateNormalizer.sanitizeUpdateRequest;
var getUpdateParams = userUpdateNormalizer.getUpdateParams;
var errorHandlers = require('../helpers/errorHandlers');

const DEFAULT_PAGE_SIZE = 10;

exports.getUsers = (req, res) => {
  let size = _.toNumber(req.query.size);
  let page = _.toNumber(req.query.page);

  let perPage = size > 0 ? size : DEFAULT_PAGE_SIZE;
  let offset = page > 0 ? (page - 1) * perPage : 0;

  User.findAll({
    include: Role,
    limit: perPage,
    offset: offset
  }).then(users => {
    let result = _.map(users, u => {
      let user = u.toJSON();
      let roleNames = _.map(user.Roles, r => r.name);
      delete user.Roles;
      user['roles'] = roleNames;
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
      errorHandlers.responseError(404, 'User does not exist', 'model', res);
    } else {
      sanitizeUpdateRequest(req, true);
      user.update(getUpdateParams(req, true)).then(user => {
        let result = user.toJSON();
        user.getRoles().then(roles => {
          let roleNames = _.map(roles, r => r.name);
          result['roles'] = roleNames;
          res.json(result);
        });
      }).catch(err => {
        errorHandlers.handleModelError(err, res);
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
  
  if (!_.isArray(roles)) {
    errorHandlers.responseError(422, 'Roles must be an array', 'param', res);
  } else {
    let user;
    User.findById(userId).then(u => {
      if (!u) {
        errorHandlers.responseError(404, 'User does not exist', 'model', res);
      } else {
        user = u;
        if (roles.length == 0) {
          return user.setRoles([]);
        } else {
          return Role.findAll({
            where: {
              name: {
                $in: roles
              }
            }
          }).then(r => {
            if (r.length > 0) {
              return user.setRoles(r);  
            } else {
              return Promise.resolve();
            }
          });
        } 
      }   
    }).then(() => {
      responseUser(user, res);
    }).catch(err => {
      errorHandlers.handleModelError(err, res);
    });
  }
};

/**
 * @summary change password of current admin user
 *
 * @since 1.1
 *
 * @param $req http request.
 * @param $req http response
 * @return 
 *   422 if not provide both oldPassword and newPassword
 *   401 if oldPassword is wrong
 *   422 if newPassword is not valid
 *   500 if cannot update password to database
 *   200 if change password succesfully and signOutAll admin user
 */
exports.postChangePassword = (req, res) => {
  let oldPassword = req.body.oldPassword || '';
  let password = req.body.password || '';
  if (oldPassword == '' || password == '') {
    let error = 'Must provide oldPassword and password';
    errorHandlers.responseError(422, error, 'param', res);
  } else {
    validate(req.user.email, oldPassword).then(u => {
      u.update({
        password: password
      }).then(user => {
        user.signOutAll().then(() => {
          res.json({
            status: 200
          });
        });
      }).catch(err => {
        errorHandlers.handleModelError(err, res);
      });
    }, () => {
      errorHandlers.responseError(401, 'Old password is not correct', 'authentication', res);
    });
  }
};

var responseUserById = (id, res) => {
  User.findById(id).then(user => {
    if (!user){
      errorHandlers.responseError(404, 'User does not exist', 'model', res);
    } else {
      responseUser(user, res);
    }
  });
};

var responseUser = (user, res) => {
  let result = user.toJSON();
  user.getRoles().then(roles => {
    let roleNames = _.map(roles, r => r.name);
    result['roles'] = roleNames;
    res.json(result);
  });
};

var validate = (email, password) => {
  let user;

  return User.findOne({where: {email: email}}).then(u => {
    if (u) {
      user = u;
      return user.verifyPassword(password);
    } else {
      return Promise.reject();
    }
  }).then(isVerified => {
    if (isVerified) {
      return Promise.resolve(user);
    } else {
      return Promise.reject();
    }
  });
};