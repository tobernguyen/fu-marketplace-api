'use strict';

var Promise = require('bluebird');
var googleapis = require('googleapis');
var OAuth2Client = googleapis.auth.OAuth2;
var oauth2 = googleapis.oauth2('v2');
var oauth2Client = new OAuth2Client(process.env.GOOGLE_ID, process.env.GOOGLE_SECRET, 'postmessage');
var getToken = Promise.promisify(oauth2Client.getToken, {context: oauth2Client});
var oauth2Get = Promise.promisify(oauth2.userinfo.get);

module.exports = {
  getUserProfile: (code) => {
    return getToken(code).then(token => {
      oauth2Client.setCredentials(token);
      
      return oauth2Get({ userId: 'me', auth: oauth2Client });
    });
  }
};
