'use strict';

const SHOP_OWNER_UPDATE_VALID_KEY = ['description', 'opening', 'status', 'address'];
const ADMIN_UPDATE_VALID_KEY = SHOP_OWNER_UPDATE_VALID_KEY.concat(['name', 'banned', 'ownerId']);
const STRING_KEY = ['description', 'name', 'address'];
const INT_KEY = ['ownerId', 'status'];
const BOOL_KEY = ['opening', 'banned'];

var _ = require('lodash');
var Shop = require('../../models').Shop;

exports.sanitizeUpdateRequest = (req, isAdmin) => {
  let updateValidKey = (isAdmin) ? ADMIN_UPDATE_VALID_KEY : SHOP_OWNER_UPDATE_VALID_KEY;

  _.intersection([updateValidKey, STRING_KEY]).forEach(k => {
    req.sanitize(k).escape();
    req.sanitize(k).trim();
  });

  _.intersection([updateValidKey, BOOL_KEY]).forEach(k => {
    req.sanitize(k).toBoolean();
  });

  _.intersection([updateValidKey, INT_KEY]).forEach(k => {
    req.sanitize(k).toInt();
  });
  
  if (!_.includes(Shop.STATUS, req.body.status)){
    _.unset(req,'body.status');
  }

}; 

exports.getUpdateParams = (req, isAdmin) => {
  let updateValidKey = (isAdmin) ? ADMIN_UPDATE_VALID_KEY : SHOP_OWNER_UPDATE_VALID_KEY;
  let updateInfo = _.pick(req.body, updateValidKey);
  return updateInfo;
};
