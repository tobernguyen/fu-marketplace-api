'use strict';

var _ = require('lodash');
var UserNotification = require('../models').UserNotification;
var errorHandlers = require('./helpers/errorHandlers');

var DEFAULT_PAGE_SIZE = 10;

exports.getUserNotifications = (req, res) => {
  let user = req.user;
  let size = _.toNumber(req.query.size);
  let page = _.toNumber(req.query.page);

  let perPage = size > 0 ? size : DEFAULT_PAGE_SIZE;
  let offset = page > 0 ? (page - 1) * perPage : 0;

  UserNotification.findAll({
    where: {
      userId: user.id
    },
    limit: perPage,
    offset: offset,
    attributes: ['type', 'data', 'createdAt']
  }).then(ns => {
    res.json({
      notifications: _.map(ns, n => n.toJSON())
    });
  }).catch(err => {
    errorHandlers.responseError(500, err, 'internal', res);
  });
};

exports.postMarkUserNotificationAsRead = (req, res) => {
  let notificationId = req.params.id;
  let user = req.user;

  UserNotification.update({
    read: true
  }, {
    where: {
      id: notificationId,
      userId: user.id,
      read: false
    }
  }).then(ns => {
    res.status(200).end();
  }).catch(err => {
    errorHandlers.responseError(500, err, 'internal', res);
  });
};

exports.postMarkAllUserNotificationAsRead = (req, res) => {
  let user = req.user;

  UserNotification.update({
    read: true
  }, {
    where: {
      userId: user.id,
      read: false
    }
  }).then(ns => {
    res.status(200).end();
  }).catch(err => {
    errorHandlers.responseError(500, err, 'internal', res);
  });
};
