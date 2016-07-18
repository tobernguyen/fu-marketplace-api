'use strict';

var bluebird = require('bluebird');
var redis = require('redis');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

var client = redis.createClient(process.env.REDIS_URI, {prefix: process.env.CACHE_NAMESPACE});

exports.set = (key, value, ttl) => {
  let setPromise = client.setAsync(key, JSON.stringify(value));

  if (typeof ttl === 'number') {
    return setPromise.then(() => {
      client.expireAsync(key, ttl);
    });
  } else {
    return setPromise;
  }
};

exports.get = (key) => {
  return client.getAsync(key).then(value => Promise.resolve(JSON.parse(value)));
};

exports.del = (key) => {
  return client.delAsync(key);
};

exports.CACHE_KEYS = {
  CONTROLLER_GET_METADATA: 'ctrlGetMetadata'
};
