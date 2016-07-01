'use strict';

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

  UserNotification.createNotificationForUser = (orderId, newStatus) => {
    return sequelize.model('Order').findOne({
      where: {
        id: orderId
      },
      attributes: ['id', 'userId', 'sellerMessage'],
      include: [
        {
          model: sequelize.model('Shop'),
          attributes: ['name', 'id']
        }
      ]
    }).then(order => {
      return UserNotification.create({
        userId: order.userId,
        type: UserNotification.NOTIFICATION_TYPE.SELLER_CHANGE_ORDER_STATUS,
        data: {
          shopId: order.Shop.id,
          shopName: order.Shop.name,
          orderId: order.id,
          newStatus: newStatus,
          sellerMessage: order.sellerMessage
        }
      });
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
          required: false
        },
        {
          model: sequelize.model('User'),
          required: false
        }
      ]
    }).then(order => {
      return UserNotification.create({
        userId: order.Shop.ownerId,
        type: notificationType,
        data: {
          buyerName: order.User.fullName,
          orderId: order.id,
          shopId: order.Shop.id,
          shopName: order.Shop.name
        }
      });
    });
  };

  UserNotification.NOTIFICATION_TYPE = NOTIFICATION_TYPE;

  return UserNotification;
};
