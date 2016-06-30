'use strict';

var NOTIFICATION_TYPE = {
  ORDER_CHANGE: 1,
  OPEN_SHOP_REQUEST_CHANGE: 2
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

  UserNotification.NOTIFICATION_TYPE = NOTIFICATION_TYPE;

  return UserNotification;
};
