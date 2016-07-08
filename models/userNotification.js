'use strict';

var kue = require('../libs/kue');
var _ = require('lodash');
var socketio = require('../libs/socket-io');

var NOTIFICATION_TYPE = {
  SELLER_CHANGE_ORDER_STATUS: 1,
  OPEN_SHOP_REQUEST_CHANGE: 2,
  USER_PLACE_ORDER: 3,
  USER_CANCEL_ORDER: 4
};

module.exports = function(sequelize, DataTypes) {
  let UserNotification = sequelize.define('UserNotification', {
    userId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      onUpdate: 'cascade',
      onDelete: 'cascade'
    },
    type: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    data: {
      type: DataTypes.JSONB
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    defaultScope: {
      order: '"createdAt" DESC'
    },
    classMethods: {
      associate: function(models) {
        UserNotification.belongsTo(models.User, {
          foreignKey: 'userId'
        });
      }
    }
  });
  
  UserNotification.createShopRequestNotification = (sorId) => {
    let ShopOpeningRequest = sequelize.model('ShopOpeningRequest');
    
    return ShopOpeningRequest.findById(sorId).then(sor => {
      return UserNotification.create({
        userId: sor.ownerId,
        type: NOTIFICATION_TYPE.OPEN_SHOP_REQUEST_CHANGE,
        data: {
          id: sor.id,
          name: sor.name,
          createdAt: sor.createdAt,
          adminMessage: sor.adminMessage,
          status: sor.status
        }
      }).then(notification => {
        // TODO: add test
        // Push real-time notification via socket.io
        pushRealTimeNotificationToUser(notification);

        // Push notification via OneSignal
        let message;

        switch(notification.data.status) {
        case ShopOpeningRequest.STATUS.ACCEPTED:
          message = `Yêu cầu mở gian hàng ${notification.data.name} của bạn đã được chấp nhận. Bạn có thể bắt đầu bán hàng ngay từ bây giờ!`;
          break;
        case ShopOpeningRequest.STATUS.REJECTED:
          message = `Yêu cầu mở gian hàng ${notification.data.name} của bạn đã bị từ chối: ${notification.data.adminMessage}`;
          break;
        }
        
        kue.createPushOneSignalNotification({
          userId: notification.userId,
          pushData: {
            headings: {
              'en': 'Yêu cầu mở gian hàng tại FU Marketplace'
            },
            contents: {
              'en': message
            },
            url: `${process.env.SITE_ROOT_URL}/`
          }
        });

        return Promise.resolve(notification);
      });
    });
  },

  UserNotification.createOrderChangeNotificationForUser = (orderId, newStatus) => {
    let fetchedOrder;
    let Order = sequelize.model('Order');

    return Order.findOne({
      where: {
        id: orderId
      },
      attributes: ['id', 'userId', 'sellerMessage'],
      include: [
        {
          model: sequelize.model('Shop'),
          attributes: ['name', 'id', 'avatar']
        }
      ]
    }).then(order => {
      fetchedOrder = order;

      return UserNotification.create({
        userId: order.userId,
        type: UserNotification.NOTIFICATION_TYPE.SELLER_CHANGE_ORDER_STATUS,
        data: {
          shopId: order.Shop.id,
          shopName: order.Shop.name,
          shopAvatar: order.Shop.avatar,
          orderId: order.id,
          newStatus: newStatus,
          sellerMessage: order.sellerMessage
        }
      });
    }).then((notification) => {
      // TODO: add test
      // Push real-time notification via socket.io
      pushRealTimeNotificationToUser(notification);

      // Push notification via OneSignal
      let message;

      switch(newStatus) {
      case Order.STATUS.ACCEPTED:
        message = `Đơn hàng #${fetchedOrder.id} tại ${fetchedOrder.Shop.name} đã bắt đầu được xử lý.`;
        break;
      case Order.STATUS.REJECTED:
        message = `Đơn hàng #${fetchedOrder.id} tại ${fetchedOrder.Shop.name} đã bị từ chối với lý do: ${fetchedOrder.sellerMessage}`;
        break;
      case Order.STATUS.SHIPPING:
        message = `Đơn hàng #${fetchedOrder.id} tại ${fetchedOrder.Shop.name} đã bắt đầu được vận chuyển.`;
        break;
      case Order.STATUS.COMPLETED:
        message = `Đơn hàng của bạn tại ${fetchedOrder.Shop.name} vừa mới hoàn thành. Nếu có thời gian, xin bạn hãy đánh giá chất lượng dịch vụ. Xin cám ơn.`;
        break;
      case Order.STATUS.ABORTED:
        message = `Đơn hàng #${fetchedOrder.id} tại ${fetchedOrder.Shop.name} đã bị huỷ với lý do: ${fetchedOrder.sellerMessage}`;
        break;
      }

      kue.createPushOneSignalNotification({
        userId: fetchedOrder.userId,
        pushData: {
          headings: {
            'en': 'Cập nhật về đơn hàng tại FU Marketplace'
          },
          contents: {
            'en': message
          },
          url: `${process.env.SITE_ROOT_URL}/`
        }
      });

      return Promise.resolve(notification);
    });
  };

  UserNotification.createNotificationForSeller = (orderId, notificationType) => {
    return sequelize.model('Order').findOne({
      where: {
        id: orderId
      },
      include: [
        {
          model: sequelize.model('Shop'),
          attributes: ['id', 'ownerId', 'name']
        },
        {
          model: sequelize.model('User'),
          attributes: ['fullName', 'avatar']
        }
      ]
    }).then(order => {
      return UserNotification.create({
        userId: order.Shop.ownerId,
        type: notificationType,
        data: {
          buyerName: order.User.fullName,
          buyerAvatar: order.User.avatar,
          orderId: order.id,
          shopId: order.Shop.id,
          shopName: order.Shop.name
        }
      });
    }).then((notification) => {
      // TODO: add test
      // Push real-time notification via socket.io
      pushRealTimeNotificationToUser(notification);

      // Push notification via OneSignal
      let message;

      switch (notificationType) {
      case NOTIFICATION_TYPE.USER_PLACE_ORDER:
        message = `Bạn có đơn hàng mới tại ${notification.data.shopName} với mã số #${notification.data.orderId} được đặt bởi ${notification.data.buyerName}`;
        break;
      case NOTIFICATION_TYPE.USER_CANCEL_ORDER:
        message = `Đơn hàng #${notification.data.orderId} đã bị huỳ bởi người mua`;
        break;
      }

      kue.createPushOneSignalNotification({
        userId: notification.userId,
        pushData: {
          headings: {
            'en': 'Cập nhật về đơn hàng tại FU Marketplace'
          },
          contents: {
            'en': message
          },
          url: `${process.env.SITE_ROOT_URL}/`
        }
      });

      return Promise.resolve(notification);
    });
  };

  UserNotification.NOTIFICATION_TYPE = NOTIFICATION_TYPE;

  return UserNotification;
};

var pushRealTimeNotificationToUser = (userNotification) => {
  socketio.pushToPrivateChannel(
    userNotification.userId,
    socketio.EVENT.NEW_NOTIFICATION,
    _.pick(userNotification, ['id', 'type', 'data', 'read', 'createdAt'])
  );
};
