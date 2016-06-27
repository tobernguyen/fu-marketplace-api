'use strict';

const USER_UPDATE_VALID_KEY = ['fullName', 'room', 'phone', 'gender', 'identityNumber'];
const ADMIN_UPDATE_VALID_KEY = USER_UPDATE_VALID_KEY.concat(['banned']);
const STRING_KEY = ['fullName', 'room', 'phone', 'gender', 'identityNumber'];
const BOOL_KEY = ['banned'];

var _ = require('lodash');

exports.sanitizeUpdateRequest = (req, isAdmin) => {
  let updateValidKey = (isAdmin) ? ADMIN_UPDATE_VALID_KEY : USER_UPDATE_VALID_KEY;
  
  _.intersection([updateValidKey, STRING_KEY]).forEach(k => {
    req.sanitize(k).escape();
    req.sanitize(k).trim();
  });

  _.intersection([updateValidKey, BOOL_KEY]).forEach(k => {
    req.sanitize(k).toBoolean();
  });
}; 

exports.getUpdateParams = (req, isAdmin) => {
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