'use strict';

const Promise = require('bluebird');

var IGNORE_ATTRIBUTES = [
  'updatedAt',
  'createdAt'
];

var ORDER_STATUS = {
  NEW: 0,
  ACCEPTED: 1,
  SHIPPING: 2,
  FINISHED: 3,
  REJECTED: 4, // by seller
  CANCELED: 5  // by buyer
};

module.exports = function(sequelize, DataTypes) {
  let Order = sequelize.define('Order', {
    userId: {
      allowNull: false,
      type: DataTypes.INTEGER
    },
    shopId: {
      allowNull: false,
      type: DataTypes.INTEGER
    },
    note: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 255]
      }
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: ORDER_STATUS.NEW
    },
    shipAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        Order.belongsTo(models.Shop, {
          foreignKey: 'shopId'
        });
        Order.belongsTo(models.User, {
          foreignKey: 'userId'
        });
        Order.hasMany(models.OrderLine, {
          foreignKey: 'orderId',
          constraints: false
        });
      }
    },
    instanceMethods: {
      toJSON: function () {
        var values = this.get();
        
        IGNORE_ATTRIBUTES.forEach(attr => {
          delete values[attr];
        });

        return values;
      },
      accept: function () {
        return new Promise((resolve, reject) => {
          if (this.status === ORDER_STATUS.NEW) {
            resolve(this.update({ status: ORDER_STATUS.ACCEPTED}));
          } else {
            let error = 'Only new order is been accepted';
            reject(error);
          }
        });
      },
      reject: function () {
        return new Promise((resolve, reject) => {
          if (this.status === ORDER_STATUS.NEW) {
            resolve(this.update({ status: ORDER_STATUS.REJECTED}));
          } else {
            let error = 'Only new order is been rejected';
            reject(error);
          }
        });
      },
      cancel: function (params) {
        return new Promise((resolve, reject) => {
          if (this.status === ORDER_STATUS.NEW || this.status === ORDER_STATUS.ACCEPTED) {
            resolve(this.update({ status: ORDER_STATUS.REJECTED}));
          } else {
            let error = 'Only new or accepted order is been cancelled';
            reject(error);
          }
        });
      },
      startShipping: function (params) {
        return new Promise((resolve, reject) =>{
          if (this.status === ORDER_STATUS.ACCEPTED) {
            Order.addHook('afterUpdate', 'autoFinishedAfterShip', autoFinishedAfterShip);
            resolve(this.update({ status: ORDER_STATUS.SHIPPING}));
          } else {
            let error = 'Only accepted order has able to be start shipping';
            reject(error);
          }
        });
      },
      finish: function (params) {
        return new Promise(function(resolve, reject) {
          if (this.status === ORDER_STATUS.SHIPPING) {
            resolve(this.update({ status: ORDER_STATUS.FINISHED}));
            Order.removeHook('afterUpdate', 'autoFinishedAfterShip');
          } else {
            let error = 'Only shiping order has able to be finished';
            reject(error);
          }
        });
      }
    }
  });
    
  Order.STATUS = ORDER_STATUS;
  Order.DELAY_AUTO_FINISHED_AFTER_SHIP = 30 * 60 * 1000; // 30mins

  var autoFinishedAfterShip = function(order, options) {
    if (!order.changed('status') || order.status !== ORDER_STATUS.SHIPPING) {
      return Promise.resolve(order);
    }
    return Promise.delay(Order.DELAY_AUTO_FINISHED_AFTER_SHIP).then(function() {
      return new Promise(function(resolve, reject) {
        Order.findById(order.id).then(order => {
          if (order.status === ORDER_STATUS.SHIPPING) {
            order.update({ status: ORDER_STATUS.FINISHED}).then(order => {
              return resolve(order);
            }).catch(err => {
              return reject(err);
            });
          }
          resolve(order);
        });
      });
    });
  };

  return Order;
};