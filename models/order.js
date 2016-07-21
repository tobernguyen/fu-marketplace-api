'use strict';

const Promise = require('bluebird');
const _ = require('lodash');
const kue = require('../libs/kue');

var ORDER_STATUS = {
  NEW: 0,
  ACCEPTED: 1,
  SHIPPING: 2,
  COMPLETED: 3, // finish by seller
  REJECTED: 4, // by seller
  CANCELED: 5,  // by buyer
  ABORTED: 6 // by seller
};

var ORDER_TYPE = {
  ACTIVE: 'ACTIVE'
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
    },
    rate: {
      type: DataTypes.INTEGER,
      validate: {
        isIn: [[1, 2, 3, 4, 5]]   
      }
    },
    comment: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 255]
      }
    },
    sellerMessage: {
      type: DataTypes.STRING,
      validate: {
        len: [1, 100]
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
        Order.hasMany(models.Ticket, {
          foreignKey: 'orderId',
          constraints: false
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
            let updateData = {status: ORDER_STATUS.ACCEPTED};
            changeStatusAndUpdateQuantityItem.apply(this, [updateData, resolve, reject]);
          } else {
            let error = 'Only new order can be accepted';
            reject({
              status: 403,
              message: error,
              type: 'order'
            });
          }
        }).then((o) => {
          kue.createSendOrderNotificationToUserJob({orderId: this.id, orderStatus: ORDER_STATUS.ACCEPTED});
          return Promise.resolve(o);
        });
      },
      reject: function (reason) {
        return new Promise((resolve, reject) => {
          if (!reason.sellerMessage) {
            let error = 'Must provide seller message when reject';
            reject({
              status: 404,
              message: error,
              type: 'order'
            });
          }

          let updateData = _.pick(reason, ['sellerMessage']);
          updateData.status = ORDER_STATUS.REJECTED;
          if (this.status === ORDER_STATUS.NEW) {
            this.update(updateData).then(resolve, reject);
          }  else if (this.status === ORDER_STATUS.ACCEPTED) {
            changeStatusAndUpdateQuantityItem.apply(this, [updateData, resolve, reject]);
          } else {
            let error = 'Only new or accepted order can be rejected';
            reject({
              status: 403,
              message: error,
              type: 'order'
            });
          }
        }).then((o) => {
          kue.createSendOrderNotificationToUserJob({orderId: this.id, orderStatus: ORDER_STATUS.REJECTED});
          return Promise.resolve(o);
        });
      },
      cancel: function () {
        return new Promise((resolve, reject) => {
          let updateData = {status: ORDER_STATUS.CANCELED};
          if (this.status === ORDER_STATUS.NEW) {
            this.update(updateData).then(resolve, reject);
          } else if (this.status === ORDER_STATUS.ACCEPTED) {
            changeStatusAndUpdateQuantityItem.apply(this, [updateData, resolve, reject]);
          } else {
            let error = 'Only new or accepted order can be cancelled';
            reject({               
              status: 403,               
              message: error,               
              type: 'order'             
            });
          }
        }).then((o) => {
          let UserNotification = sequelize.model('UserNotification');
          kue.createSendOrderNotificationToSellerJob({orderId: this.id, notificationType: UserNotification.NOTIFICATION_TYPE.USER_CANCEL_ORDER});
          return Promise.resolve(o);
        });
      },
      startShipping: function () {
        return new Promise((resolve, reject) =>{
          if (this.status === ORDER_STATUS.ACCEPTED) {
            this.update({status: ORDER_STATUS.SHIPPING}).then(resolve, reject);
          } else {
            let error = 'Only accepted order has able to be start shipping';
            reject({               
              status: 403,               
              message: error,               
              type: 'order'             
            });
          }
        }).then((o) => {
          kue.createSendOrderNotificationToUserJob({orderId: this.id, orderStatus: ORDER_STATUS.SHIPPING});
          return Promise.resolve(o);
        });
      },
      complete: function () {
        return new Promise((resolve, reject) => {
          if (this.status === ORDER_STATUS.SHIPPING) {
            this.update({status: ORDER_STATUS.COMPLETED}).then(resolve, reject);
          } else {
            let error = 'Only shipping order has able to be completed';
            reject({               
              status: 403,               
              message: error,               
              type: 'order'            
            });
          }
        }).then((o) => {
          kue.createSendOrderNotificationToUserJob({orderId: this.id, orderStatus: ORDER_STATUS.COMPLETED});
          return Promise.resolve(o);
        });
      },
      abort: function (reason) {
        return new Promise((resolve, reject) => {
          if (!reason.sellerMessage) {
            let error = 'Must provide seller message when abort';
            reject({
              status: 404,
              message: error,
              type: 'order'
            });
          }

          let updateData = _.pick(reason, ['sellerMessage']);
          updateData.status = ORDER_STATUS.ABORTED;

          if (this.status === ORDER_STATUS.SHIPPING) {
            changeStatusAndUpdateQuantityItem.apply(this, [updateData, resolve, reject]);
          } else {
            let error = 'Only shipping order has able to be aborted';
            reject({               
              status: 403,               
              message: error,               
              type: 'order'             
            });
          }
        }).then((o) => {
          kue.createSendOrderNotificationToUserJob({orderId: this.id, orderStatus: ORDER_STATUS.ABORTED});
          return Promise.resolve(o);
        });
      },
      rateOrder: function (rateInfo) {
        return new Promise((resolve, reject) => {
          let rawInfo = _.pick(rateInfo, ['rate', 'comment']);

          if (!rawInfo.rate) {
            let error = 'Must provide rate when rate order';
            reject({
              status: 404,
              message: error,
              type: 'order'
            });
          }

          if (!rawInfo.comment) {
            rawInfo.comment = '';
          }

          if (this.status === ORDER_STATUS.COMPLETED || this.status === ORDER_STATUS.ABORTED) {
            this.update(rawInfo).then(resolve, reject);
          } else {
            let error = 'Can only rate completed or aborted order';
            reject({
              status: 403,
              message: error,
              type: 'order'
            });
          }
        });
      },
      createTicket: function (ticketInfo) {
        let rawInfo = _.pick(ticketInfo, ['userNote']);

        if (!rawInfo.userNote) {
          rawInfo.userNote = '';
        }

        return sequelize.model('Ticket').create({
          orderId: this.id,
          userNote: rawInfo.userNote
        });
      }
    }
  });

  var changeStatusAndUpdateQuantityItem = function(updateData, resolve, reject) {
    let action = 'decrement';
    switch(updateData.status) {
      case ORDER_STATUS.ACCEPTED:
        action = 'decrement';
        break;
      case ORDER_STATUS.REJECTED:
      case ORDER_STATUS.CANCELED:
      case ORDER_STATUS.ABORTED:
        action = 'increment';
        break;
    }
    let order;
    return sequelize.transaction(t => {
      let options = { transaction: t };
      let itemInOrder;
      return this.update(updateData, options).then(o => {
        order = o;
        return o.getOrderLines(options);
      }).then(odl => {
        itemInOrder = _.map(odl, ol => {
          let orderLineItem = {};
          orderLineItem.id = ol.item.id;
          orderLineItem.quantity = ol.quantity;
          return orderLineItem;
        });

        let itemIds = _.map(itemInOrder, i => i.id); 

        return sequelize.model('Item').findAll({
          where: {
            id: {
              $in: itemIds
            }
          },
          transaction: t
        });
      }).then(items => {

        let promises = [];

        _.forEach(items, function(item, i){
          if (_.isNumber(item.quantity)) {
            promises[promises.length] =  item[action](['quantity'], { by: itemInOrder[i].quantity, transaction: t });
          }
        });

        if (promises.length > 0 ){
          return Promise.all(promises);
        } else {
          return Promise.resolve();
        }

      });
    }).then(() => {
      resolve(order);
    }).catch(err => {
      reject(err);
    }); 
  };
    
  Order.STATUS = ORDER_STATUS;
  Order.TYPE = ORDER_TYPE;

  return Order;
};
