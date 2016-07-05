'use strict';

const helper = require('../helper');
const models = require('../../models');
const Order = require('../../models').Order;
const UserNotification = require('../../models').UserNotification;

describe('UserNotification Model', () => {
  describe('.createOrderChangeNotificationForUser', () => {
    let order;

    before(done => {
      helper.factory.createOrder({status: Order.STATUS.REJECTED, sellerMessage: 'Hết hàng rồi'}).then(o => {
        order = o;
        done();
      });
    });

    it('should create notification for user with correct data', done => {
      helper.queue.testMode.clear();

      UserNotification.createOrderChangeNotificationForUser(order.id, Order.STATUS.REJECTED).then(un => {
        expect(un.type).to.equal(UserNotification.NOTIFICATION_TYPE.SELLER_CHANGE_ORDER_STATUS);
        expect(un.userId).to.equal(order.userId);

        let notificationData = un.data;
        expect(notificationData.shopId).to.equal(order.shopId);
        expect(notificationData.orderId).to.equal(order.id);
        expect(notificationData.newStatus).to.equal(Order.STATUS.REJECTED);
        expect(notificationData.sellerMessage).to.equal('Hết hàng rồi');

        order.getShop().then(shop => {
          expect(notificationData.shopName).to.equal(shop.name);

          let jobs = helper.queue.testMode.jobs;
          expect(jobs[0].type).to.equal('push one signal notification');
          expect(jobs[0].data).to.eql({
            userId: order.userId,
            pushData: {
              headings: {
                'en': 'Cập nhật về đơn hàng tại FU Marketplace'
              },
              contents: {
                'en': `Đơn hàng #${order.id} tại ${shop.name} đã bị từ chối với lý do: Hết hàng rồi`
              },
              url: `${process.env.SITE_ROOT_URL}/`
            }
          });
          done();
        });
      });
    });
  });

  describe('.createShopRequestNotification', () => {
    let sor;
    let ShopOpeningRequest = models['ShopOpeningRequest'];

    before(done => {
      helper.factory.createShopOpeningRequest({status: ShopOpeningRequest.STATUS.ACCEPTED, adminMessage: 'Good job'}).then(s => {
        sor = s;
        done();
      });
    });

    it('should create notification for user about shop opening request changes', done => {
      helper.queue.testMode.clear();

      UserNotification.createShopRequestNotification(sor.id).then(notification => {
        expect(notification.userId).to.equal(sor.ownerId);
        expect(notification.type).to.equal(UserNotification.NOTIFICATION_TYPE.OPEN_SHOP_REQUEST_CHANGE);
        expect(notification.data.id).to.equal(sor.id);
        expect(notification.data.name).to.equal(sor.name);
        expect(notification.data.adminMessage).to.equal(sor.adminMessage);
        expect(notification.data.status).to.equal(sor.status);
        expect(new Date(notification.data.createdAt)).to.eql(sor.createdAt);

        // Expect it to enqueue job "push one signal notification"
        let jobs = helper.queue.testMode.jobs;
        expect(jobs[0].type).to.equal('push one signal notification');
        expect(jobs[0].data).to.eql({
          userId: notification.userId,
          pushData: {
            headings: {
              'en': 'Yêu cầu mở gian hàng tại FU Marketplace'
            },
            contents: {
              'en': `Yêu cầu mở gian hàng ${notification.data.name} của bạn đã được chấp nhận. Bạn có thể bắt đầu bán hàng ngay từ bây giờ!`
            },
            url: `${process.env.SITE_ROOT_URL}/`
          }
        });


        done();
      }).catch(done);
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
      helper.queue.testMode.clear();
      
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

          let jobs = helper.queue.testMode.jobs;
          expect(jobs[0].type).to.equal('push one signal notification');
          expect(jobs[0].data).to.eql({
            userId: order.userId,
            pushData: {
              headings: {
                'en': 'Cập nhật về đơn hàng tại FU Marketplace'
              },
              contents: {
                'en': `Bạn có đơn hàng mới tại ${notificationData.shopName} với mã số #${notificationData.orderId} được đặt bởi ${notificationData.buyerName}`
              },
              url: `${process.env.SITE_ROOT_URL}/`
            }
          });
          
          done();
        });
      });
    });
  });
});
