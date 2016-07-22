'use strict';

const helper = require('../helper');
const request = require('supertest-as-promised');
const app = require('../../app.js');
const models = require('../../models');
const Order = models.Order;
const ShopOpeningRequest = models.ShopOpeningRequest;
const faker = require('faker');
const _ = require('lodash');

describe('GET /api/v1/users/me/notifications', () => {
  let user, accessToken, notifications = [];
  
  before(done => {
    helper.factory.createUser().then(u => {
      user = u;
      accessToken = helper.createAccessTokenForUserId(u.id);

      let promises = [];

      _.times(20, i => {
        promises[promises.length] = models.UserNotification.create({
          userId: u.id,
          type: models.UserNotification.NOTIFICATION_TYPE.SELLER_CHANGE_ORDER_STATUS,
          data: {shopId: i, shopName: faker.name.findName(), orderId: i + 1, oldStatus: Order.STATUS.NEW, newStatus: Order.STATUS.ACCEPTED},
          read: true
        });
      });

      return Promise.all(promises);
    }).then(notis => {
      notifications = notis;

      return models.UserNotification.create({
        userId: user.id,
        type: models.UserNotification.NOTIFICATION_TYPE.SELLER_CHANGE_ORDER_STATUS,
        data: {shopId: 1, shopName: 'Alo bố nghe', orderId: 2, oldStatus: Order.STATUS.NEW, newStatus: Order.STATUS.ACCEPTED}
      });
    }).then(n => {
      notifications.push(n);

      return models.UserNotification.create({
        userId: user.id,
        type: models.UserNotification.NOTIFICATION_TYPE.SELLER_CHANGE_ORDER_STATUS,
        data: {shopId: 2, shopName: 'Alo mình nghe', orderId: 3, oldStatus: Order.STATUS.ACCEPTED, newStatus: Order.STATUS.SHIPPING}
      }); 
    }).then(n => {
      notifications.push(n);

      return models.UserNotification.create({
        userId: user.id,
        type: models.UserNotification.NOTIFICATION_TYPE.OPEN_SHOP_REQUEST_CHANGE,
        data: {shopName: 'Bao văn su', oldStatus: ShopOpeningRequest.STATUS.PENDING, newStatus: ShopOpeningRequest.STATUS.ACCEPTED, adminMessage: 'Làm ăn tốt nhé!'}
      });
    }).then(n => {
      notifications.push(n);
      done();
    });
  });

  describe('with valid access token', () => {
    it('should return 200 and 10 latest notification', done => {
      request(app)
        .get('/api/v1/users/me/notifications')
        .set('X-Access-Token', accessToken)
        .expect(200)
        .then(res => {
          expect(res.body.unreadCount).to.equal(3); // We have 3 unread notifications only

          let actualNotifications = res.body.notifications;
          expect(actualNotifications).to.be.an('array');
          expect(actualNotifications).to.have.lengthOf(10);

          let firstNotification = actualNotifications[0];
          expect(firstNotification.id).to.equal(notifications[notifications.length - 1].id);
          expect(firstNotification.type).to.equal(models.UserNotification.NOTIFICATION_TYPE.OPEN_SHOP_REQUEST_CHANGE);
          expect(firstNotification.data).to.deep.equal({shopName: 'Bao văn su', oldStatus: ShopOpeningRequest.STATUS.PENDING, newStatus: ShopOpeningRequest.STATUS.ACCEPTED, adminMessage: 'Làm ăn tốt nhé!'});
          expect(firstNotification.read).to.equal(false);

          let secondNotification = actualNotifications[1];
          expect(secondNotification.type).to.equal(models.UserNotification.NOTIFICATION_TYPE.SELLER_CHANGE_ORDER_STATUS);
          expect(secondNotification.data).to.deep.equal({shopId: 2, shopName: 'Alo mình nghe', orderId: 3, oldStatus: Order.STATUS.ACCEPTED, newStatus: Order.STATUS.SHIPPING});
          expect(secondNotification.read).to.equal(false);

          done();
        });
    });

    it('should accept page params to get more notifications', done => {
      request(app)
        .get('/api/v1/users/me/notifications')
        .set('X-Access-Token', accessToken)
        .expect(200)
        .then(res => {
          expect(res.body.notifications).to.have.lengthOf(10);

          return request(app)
            .get('/api/v1/users/me/notifications')
            .set('X-Access-Token', accessToken)
            .query({page: 2})
            .expect(200);
        }).then(res => {
          expect(res.body.notifications).to.have.lengthOf(10);

          return request(app)
            .get('/api/v1/users/me/notifications')
            .set('X-Access-Token', accessToken)
            .query({page: 3})
            .expect(200);
        }).then(res => {
          expect(res.body.notifications).to.have.lengthOf(3);
          done();
        });
    });
  });
});

describe('POST /api/v1/users/me/notifications/:id/read', () => {
  let user, accessToken, notification;

  before(done => {
    helper.factory.createUser().then(u => {
      user = u;
      accessToken = helper.createAccessTokenForUserId(u.id);

      return models.UserNotification.create({
        userId: user.id,
        type: models.UserNotification.NOTIFICATION_TYPE.SELLER_CHANGE_ORDER_STATUS,
        data: {shopId: 1, shopName: 'Alo bố nghe', orderId: 2, oldStatus: Order.STATUS.NEW, newStatus: Order.STATUS.ACCEPTED}
      });
    }).then(n => {
      notification = n;
      done();
    });
  });

  it('should return 200', done => {
    request(app)
      .post(`/api/v1/users/me/notifications/${notification.id}/read`)
      .set('X-Access-Token', accessToken)
      .expect(200)
      .then(() => {
        return notification.reload();
      }).then(notification => {
        expect(notification.read).to.equal(true);
        done();
      });
  });
});

describe('POST /api/v1/users/me/notifications/read', () => {
  let accessToken, notifications;

  before(done => {
    helper.factory.createUser().then(u => {
      accessToken = helper.createAccessTokenForUserId(u.id);

      let promises = [];

      _.times(3, i => {
        promises[promises.length] = models.UserNotification.create({
          userId: u.id,
          type: models.UserNotification.NOTIFICATION_TYPE.SELLER_CHANGE_ORDER_STATUS,
          data: {shopId: i, shopName: faker.name.findName(), orderId: i + 1, oldStatus: Order.STATUS.NEW, newStatus: Order.STATUS.ACCEPTED}
        });
      });

      return Promise.all(promises);
    }).then(notis => {
      notifications = notis;
      done();
    });
  });

  it('should return 200', done => {
    request(app)
      .post('/api/v1/users/me/notifications/read')
      .set('X-Access-Token', accessToken)
      .expect(200)
      .then(() => {
        return Promise.all(_.map(notifications, n => n.reload()));
      }).then(notification => {
        notification.forEach(notification => {
          expect(notification.read).to.equal(true);
        });
        done();
      });
  });
});
