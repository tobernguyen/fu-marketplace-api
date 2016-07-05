'use strict';

var assert = require('assert');
var REDIS_URI = process.env.REDIS_URI;
var KUE_REDIS_PREFIX = process.env.KUE_REDIS_PREFIX;

assert(REDIS_URI, 'Missing REDIS_URI in environment variable');
assert(KUE_REDIS_PREFIX, 'Missing KUE_REDIS_PREFIX in environment variable');

var kue = require('kue');
var queue = kue.createQueue({
  redis: REDIS_URI,
  prefix: KUE_REDIS_PREFIX
});

var elasticsearch = require('./elasticsearch');
var OneSignal = require('./onesignal');
var UserNotification = require('../models').UserNotification;
var logger = require('./logger');

////////////////
// Config Kue //
////////////////

// Graceful shutdown, wait 30s for job to be completed before kill them
var graceful = () => {
  queue.shutdown(30000, err => {
    logger.log('Kue shutdown: ', err || 'OK');
    process.exit(0);
  });
};

queue.on('error', function(err) {
  logger.error('Kue error: ', err);
});

queue.watchStuckJobs(5000);

process.once('SIGTERM', graceful);
process.once('SIGINT', graceful);
process.once('uncaughtException', graceful);

//////////////////
// Job Process //
/////////////////

queue.process('update shop index', 10, (job, done) => {
  elasticsearch.indexShopById(job.data.shopId).then(() => done(), done);
});

queue.process('delete shop index', 10, (job, done) => {
  elasticsearch.deleteShopIndexById(job.data.shopId).then(() => done(), done);
});

queue.process('send order notification to user', 5, (job, done) => {
  let data = job.data;
  UserNotification.createOrderChangeNotificationForUser(data.orderId, data.orderStatus).then(() => done(), done);
});

queue.process('send order notification to seller', 5, (job, done) => {
  let data = job.data;
  UserNotification.createNotificationForSeller(data.orderId, data.notificationType).then(() => done(), done);
});

queue.process('send shop opening request notification', 5, (job, done) => {
  let data = job.data;
  UserNotification.createShopRequestNotification(data.shopOpeningRequestId).then(() => done(), done);
});

queue.process('push one signal notification', 5, (job, done) => {
  let data = job.data;
  OneSignal.pushNotificationToUserId(data.userId, data.pushData).then(() => done(), done);
});

exports.queue = queue;

///////////////////////////
// PRE-DEFINED JOB HERE //
//////////////////////////

var createUpdateShopJob = (jobData) => {
  queue.createJob('update shop index', jobData)
    .priority('high')
    .attempts(5)  // Retry 5 times if failed, after that give up
    .backoff({ delay: 30 * 1000, type: 'fixed' }) // Wait for 30s before retrying
    .ttl(10000) // Kill the job if it take more than 10s
    .removeOnComplete(true)
    .save();
};
exports.createUpdateShopIndexJob = createUpdateShopJob;

var createDeleteShopIndexJob = (jobData) => {
  queue.createJob('delete shop index', jobData)
    .priority('high')
    .attempts(5)  // Retry 5 times if failed, after that give up
    .backoff({ delay: 30 * 1000, type: 'fixed' }) // Wait for 30s before retrying
    .ttl(10000) // Kill the job if it take more than 10s
    .removeOnComplete(true)
    .save();
};
exports.createDeleteShopIndexJob = createDeleteShopIndexJob;

var createSendOrderNotificationToUserJob = (jobData) => {
  queue.createJob('send order notification to user', jobData)
    .priority('normal')
    .attempts(3)  // Retry 5 times if failed, after that give up
    .backoff({ delay: 30 * 1000, type: 'fixed' }) // Wait for 30s before retrying
    .ttl(10000) // Kill the job if it take more than 10s
    .removeOnComplete(true)
    .save();
};
exports.createSendOrderNotificationToUserJob = createSendOrderNotificationToUserJob;

var createSendOrderNotificationToSellerJob = (jobData) => {
  queue.createJob('send order notification to seller', jobData)
    .priority('normal')
    .attempts(3)  // Retry 5 times if failed, after that give up
    .backoff({ delay: 30 * 1000, type: 'fixed' }) // Wait for 30s before retrying
    .ttl(10000) // Kill the job if it take more than 10s
    .removeOnComplete(true)
    .save();
};
exports.createSendOrderNotificationToSellerJob = createSendOrderNotificationToSellerJob;

var createSendShopOpeningRequestNotificationJob = (jobData) => {
  queue.createJob('send shop opening request notification', jobData)
    .priority('normal')
    .attempts(3)  // Retry 5 times if failed, after that give up
    .backoff({ delay: 30 * 1000, type: 'fixed' }) // Wait for 30s before retrying
    .ttl(10000) // Kill the job if it take more than 10s
    .removeOnComplete(true)
    .save();
};
exports.createSendShopOpeningRequestNotificationJob = createSendShopOpeningRequestNotificationJob;


var createPushOneSignalNotification = (jobData) => {
  queue.createJob('push one signal notification', jobData)
    .priority('normal')
    .attempts(3)  // Retry 5 times if failed, after that give up
    .backoff({ delay: 30 * 1000, type: 'fixed' }) // Wait for 30s before retrying
    .ttl(10000) // Kill the job if it take more than 10s
    .removeOnComplete(true)
    .save();
};
exports.createPushOneSignalNotification = createPushOneSignalNotification;
