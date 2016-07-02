'use strict';

var _axios = require('axios');
var assert = require('assert');
var sha1 = require('sha1');

var ONE_SIGNAL_APP_ID = process.env.ONE_SIGNAL_APP_ID;
var ONE_SIGNAL_API_KEY = process.env.ONE_SIGNAL_API_KEY;

assert(ONE_SIGNAL_APP_ID, 'ONE_SIGNAL_APP_ID is missing');
assert(ONE_SIGNAL_API_KEY, 'ONE_SIGNAL_API_KEY is missing');

var axios = _axios.create({
  baseURL: 'https://onesignal.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${ONE_SIGNAL_API_KEY}`
  }
});

// TODO: write test for this
var addUserToPlayerId = (playerId, userId) => {
  let hashedUserTag = sha1(`userId_${userId}`);
  let tags = {};
  tags[hashedUserTag] = true;

  return axios.put(`/players/${playerId}`, {
    app_id: ONE_SIGNAL_APP_ID,
    tags: tags
  });
};
exports.addUserToPlayerId = addUserToPlayerId;

// TODO: write test for this
var pushNotificationToUserId = (userId, data) => {
  if (process.env.NODE_ENV === 'test') return Promise.resolve();

  let hashedUserTag = sha1(`userId_${userId}`);

  return axios.post('/notifications', {
    app_id: ONE_SIGNAL_APP_ID,
    contents: data.contents,
    headings: data.headings,
    url: data.url,
    tags: [
      { key: hashedUserTag, relation: '=', value: true }
    ]
  });
};
exports.pushNotificationToUserId = pushNotificationToUserId;
