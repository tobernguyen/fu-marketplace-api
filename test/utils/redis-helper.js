'use strict';

var Promise = require('bluebird');
var redis = require('redis');
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

var client = redis.createClient({url: process.env.REDIS_URI});


var flushAll = () => {
  return client.flushallAsync();
};
exports.flushAll = flushAll;
