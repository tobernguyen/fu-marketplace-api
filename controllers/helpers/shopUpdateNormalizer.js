'use strict';

const SHOP_OWNER_UPDATE_VALID_KEY = ['name', 'description', 'opening', 'ownerId'];
const ADMIN_UPDATE_VALID_KEY = SHOP_OWNER_UPDATE_VALID_KEY.concat(['banned']);

var _ = require('lodash');

exports.sanitizeUpdateRequest = (req, isAdmin) => {
  let updateValidKey = (isAdmin) ? ADMIN_UPDATE_VALID_KEY : SHOP_OWNER_UPDATE_VALID_KEY;
  updateValidKey.forEach(k => {
    req.sanitize(k).escape();
    req.sanitize(k).trim();
  });
}; 

exports.getUpdateParams = (req, isAdmin) => {
  let updateValidKey = (isAdmin) ? ADMIN_UPDATE_VALID_KEY : SHOP_OWNER_UPDATE_VALID_KEY;
  let updateInfo = _.pick(req.body, updateValidKey);
  return updateInfo;
};