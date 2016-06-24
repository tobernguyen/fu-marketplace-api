'use strict';

const Promise = require('bluebird');

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
        return this.get();
      },
      accept: function () {
        return new Promise((resolve, reject) => {
          if (this.status === ORDER_STATUS.NEW) {
            this.update({ status: ORDER_STATUS.ACCEPTED}).then(resolve, reject);
          } else {
            let error = 'Only new order can be accepted';
            reject(error);
          }
        });
      },
      reject: function () {
        return new Promise((resolve, reject) => {
          if (this.status === ORDER_STATUS.NEW || this.status === ORDER_STATUS.ACCEPTED) {
            this.update({ status: ORDER_STATUS.REJECTED}).then(resolve, reject);
          } else {
            let error = 'Only new order can be rejected';
            reject(error);
          }
        });
      },
      cancel: function (params) {
        return new Promise((resolve, reject) => {
          if (this.status === ORDER_STATUS.NEW || this.status === ORDER_STATUS.ACCEPTED) {
            this.update({ status: ORDER_STATUS.CANCELED}).then(resolve, reject);
          } else {
            let error = 'Only new or accepted order can be cancelled';
            reject(error);
          }
        });
      },
      startShipping: function (params) {
        return new Promise((resolve, reject) =>{
          if (this.status === ORDER_STATUS.ACCEPTED) {
            this.update({ status: ORDER_STATUS.SHIPPING}).then(resolve, reject);
          } else {
            let error = 'Only accepted order has able to be start shipping';
            reject(error);
          }
        });
      },
      finish: function (params) {
        return new Promise(function(resolve, reject) {
          if (this.status === ORDER_STATUS.SHIPPING) {
            this.update({ status: ORDER_STATUS.FINISHED}).then(resolve, reject);
          } else {
            let error = 'Only shiping order has able to be finished';
            reject(error);
          }
        });
      }
    }
  });
    
  Order.STATUS = ORDER_STATUS;

  return Order;
};