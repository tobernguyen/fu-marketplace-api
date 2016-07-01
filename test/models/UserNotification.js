'use strict';

const helper = require('../helper');
const models = require('../../models');
const Order = require('../../models').Order;
const UserNotification = require('../../models').UserNotification;

describe('UserNotification Model', () => {
  describe('.createNotificationForUser', () => {
    let order;

    before(done => {
      helper.factory.createOrder({status: Order.STATUS.REJECTED, sellerMessage: 'Hết hàng rồi'}).then(o => {
        order = o;
        done();
      });
    });

    it('should create notification for user with correct data', done => {
      UserNotification.createNotificationForUser(order.id, Order.STATUS.REJECTED).then(un => {
        expect(un.type).to.equal(UserNotification.NOTIFICATION_TYPE.SELLER_CHANGE_ORDER_STATUS);
        expect(un.userId).to.equal(order.userId);

        let notificationData = un.data;
        expect(notificationData.shopId).to.equal(order.shopId);
        expect(notificationData.orderId).to.equal(order.id);
        expect(notificationData.newStatus).to.equal(Order.STATUS.REJECTED);
        expect(notificationData.sellerMessage).to.equal('Hết hàng rồi');

        order.getShop().then(shop => {
          expect(notificationData.shopName).to.equal(shop.name);
          done();
        });
      });
    });
  });

  describe('.createNotificationForSeller', () => {
    let order;

    before(done => {
      helper.factory.createOrder({}).then(o => {
        order = o;
        done();
      });
    });

    it('should create notification for shop owner with correct data', done => {
      UserNotification.createNotificationForSeller(order.id, UserNotification.NOTIFICATION_TYPE.USER_PLACE_ORDER).then(un => {
        expect(un.type).to.equal(UserNotification.NOTIFICATION_TYPE.USER_PLACE_ORDER);

        Order.findOne({
          where: {
            id: order.id
          },
          include: [
            {
              model: models['Shop'],
              attributes: ['id', 'name', 'ownerId']
            },
            {
              model: models['User'],
              attributes: ['fullName']
            }
          ]
        }).then(order => {
          expect(un.userId).to.equal(order.Shop.ownerId);
          let notificationData = un.data;

          expect(notificationData.buyerName).to.equal(order.User.fullName);
          expect(notificationData.orderId).to.equal(order.id);
          expect(notificationData.shopId).to.equal(order.Shop.id);
          expect(notificationData.shopName).to.equal(order.Shop.name);

          done();
        });
      });
    });
  });
});
