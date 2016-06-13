'use strict';

const SHOP_OWNER_UPDATE_VALID_KEY = ['description', 'opening', 'status', 'address'];
const ADMIN_UPDATE_VALID_KEY = SHOP_OWNER_UPDATE_VALID_KEY.concat(['name', 'banned', 'ownerId']);

var _ = require('lodash');
var Shop = require('../../models/shop');

exports.sanitizeUpdateRequest = (req, isAdmin) => {
  let updateValidKey = (isAdmin) ? ADMIN_UPDATE_VALID_KEY : SHOP_OWNER_UPDATE_VALID_KEY;
  updateValidKey.forEach(k => {
    req.sanitize(k).escape();
    req.sanitize(k).trim();
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
