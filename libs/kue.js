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

exports._kue = kue;

var elasticsearch = require('./elasticsearch');
var OneSignal = require('./onesignal');
var emailer = require('./emailer');
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
  let UserNotification = require('../models').UserNotification;
  UserNotification.createOrderChangeNotificationForUser(data.orderId, data.orderStatus).then(() => done(), done);
});

queue.process('send order notification to seller', 5, (job, done) => {
  let data = job.data;
  let UserNotification = require('../models').UserNotification;
  UserNotification.createNotificationForSeller(data.orderId, data.notificationType).then(() => done(), done);
});

queue.process('send shop opening request notification', 5, (job, done) => {
  let data = job.data;
  let UserNotification = require('../models').UserNotification;
  UserNotification.createShopRequestNotification(data.shopOpeningRequestId).then(() => done(), done);
});

queue.process('push one signal notification', 5, (job, done) => {
  let data = job.data;
  OneSignal.pushNotificationToUserId(data.userId, data.pushData).then(() => done(), done);
});

queue.process('email', 2, (job, done) => {
  let getEmailOptionsPromise;

  switch(job.data.template) {
    case emailer.EMAIL_TEMPLATE.NEW_SHOP_OPENING_REQUEST: {
      getEmailOptionsPromise = getEmailOptionForNewShopOpeningRequest(job.data.data.shopOpeningRequestId);
      break;
    }
    case emailer.EMAIL_TEMPLATE.RESPONSE_SHOP_OPENING_REQUEST: {
      getEmailOptionsPromise = getEmailOptionForResponseShopOpeningRequest(job.data.data.shopOpeningRequestId);
      break;
    }
  }

  getEmailOptionsPromise.then(options => {
    return emailer.sendEmail(options);
  }).then(() => done(), done);
});

// TODO: add test
var getEmailOptionForNewShopOpeningRequest = (id) => {
  let ShopOpeningRequest = require('../models').ShopOpeningRequest;
  let Configuration = require('../models').Configuration;

  let emailTo;

  return Configuration.get(Configuration.KEYS.SHOP_REQUEST_MAILING_LIST).then(emailAddresses => {
    emailTo = emailAddresses;

    return ShopOpeningRequest.findOne({
      where: {
        id: id
      },
      include: require('../models').User
    });
  }).then(sor => {
    let options = {
      template: emailer.EMAIL_TEMPLATE.NEW_SHOP_OPENING_REQUEST,
      from: emailer.EMAIL_ADDRESSES.NO_REPLY,
      to: emailTo,
      subject: `${sor.User.fullName} yêu cầu mở shop mới với tên: ${sor.name}`,
      data: sor.toJSON()
    };

    return Promise.resolve(options);
  });
};

// TODO: add test
var getEmailOptionForResponseShopOpeningRequest = (id) => {
  let ShopOpeningRequest = require('../models').ShopOpeningRequest;
  return ShopOpeningRequest.findOne({
    where: {
      id: id
    },
    include: require('../models').User
  }).then(sor => {
    let isAccepted = sor.status === ShopOpeningRequest.STATUS.ACCEPTED;
    let data = sor.toJSON();
    data[isAccepted] = isAccepted;

    let options = {
      template: emailer.EMAIL_TEMPLATE.RESPONSE_SHOP_OPENING_REQUEST,
      from: emailer.EMAIL_ADDRESSES.NO_REPLY,
      to: sor.User.email,
      subject: `Yêu cầu mở shop "${sor.name}" đã ${isAccepted ? 'được chấp nhận' : 'bị từ chối'}`,
      data: data
    };

    return Promise.resolve(options);
  });
};

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
    .attempts(3)  // Retry 3 times if failed, after that give up
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
    .attempts(3)  // Retry 3 times if failed, after that give up
    .backoff({ delay: 30 * 1000, type: 'fixed' }) // Wait for 30s before retrying
    .ttl(10000) // Kill the job if it take more than 10s
    .removeOnComplete(true)
    .save();
};
exports.createSendShopOpeningRequestNotificationJob = createSendShopOpeningRequestNotificationJob;


var createPushOneSignalNotification = (jobData) => {
  queue.createJob('push one signal notification', jobData)
    .priority('normal')
    .attempts(3)  // Retry 3 times if failed, after that give up
    .backoff({ delay: 30 * 1000, type: 'fixed' }) // Wait for 30s before retrying
    .ttl(10000) // Kill the job if it take more than 10s
    .removeOnComplete(true)
    .save();
};
exports.createPushOneSignalNotification = createPushOneSignalNotification;

var createEmailJob = (jobData) => {
  queue.createJob('email', jobData)
    .priority('high')
    .attempts(5)  // Retry 5 times if failed, after that give up
    .backoff({ delay: 30 * 1000, type: 'fixed' }) // Wait for 30s before retrying
    .ttl(30000) // Kill the job if it take more than 10s
    .removeOnComplete(true)
    .save();
};
exports.createEmailJob = createEmailJob;