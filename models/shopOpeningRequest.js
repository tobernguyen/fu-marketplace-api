'use strict';

const _ = require('lodash');
const kue = require('../libs/kue');
const emailer = require('../libs/emailer');

const IGNORE_ATTRIBUTES = [
  'updatedAt',
  'createdAt'
];

const SHOP_OPENING_REQUEST_STATUS = {
  PENDING: 0,
  REJECTED: 1,
  ACCEPTED: 2
};

module.exports = function(sequelize, DataTypes) {
  let ShopOpeningRequest = sequelize.define('ShopOpeningRequest', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    note: {
      type: DataTypes.TEXT
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: SHOP_OPENING_REQUEST_STATUS.PENDING
    },
    adminMessage: {
      type: DataTypes.TEXT
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    hooks: {
      afterCreate: function(sor, options) {
        // Send email to shop request reviewer
        kue.createEmailJob({
          template: emailer.EMAIL_TEMPLATE.NEW_SHOP_OPENING_REQUEST,
          data: { shopOpeningRequestId: sor.id }
        });
      }
    },
    scopes: {
      pending: {
        where: {
          status: SHOP_OPENING_REQUEST_STATUS.PENDING
        }
      }
    },
    classMethods: {
      associate: function(models) {
        ShopOpeningRequest.belongsTo(models.User, {
          foreignKey: 'ownerId',
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
      accept: function(adminMessage) {
        let newShopId;

        return sequelize.transaction(t => {
          // Create new shop by copying SOR attribute
          return sequelize.model('Shop').create({
            name: this.name,
            description: this.description,
            ownerId: this.ownerId,
            address: this.address,
            status: sequelize.model('Shop').STATUS.UNPUBLISHED,
            avatar: '',
            cover: '',
            phone: this.phone
          }, {transaction: t}).then(shop => {
            newShopId = shop.id;

            // Change status of this request to accepted
            return this.update({
              status: SHOP_OPENING_REQUEST_STATUS.ACCEPTED,
              adminMessage: adminMessage
            }, {transaction: t});
          }).then(() => {
            // Assign role seller to user if he/she is not
            return sequelize.model('User').findOne({
              where: {id: this.ownerId},
              include: sequelize.model('Role'),
              transaction: t
            }).then(u => {
              let owner = u;

              if (_.findIndex(u.Roles, r => r.name === 'seller') !== -1) {
                return Promise.resolve();
              } else {
                return sequelize.model('Role').findOne({
                  where: {
                    name: 'seller'
                  },
                  transaction: t
                }).then(r => owner.addRole(r, {transaction: t}));
              }
            });
          });
        }).then(() => {
          // Create and send notification to user
          kue.createSendShopOpeningRequestNotificationJob({shopOpeningRequestId: this.id, shopId: newShopId});

          // Send email to requester
          kue.createEmailJob({
            template: emailer.EMAIL_TEMPLATE.RESPONSE_SHOP_OPENING_REQUEST,
            data: { shopOpeningRequestId: this.id }
          });
          return Promise.resolve();
        });
      },
      reject: function(adminMessage) {
        return this.update({
          status: SHOP_OPENING_REQUEST_STATUS.REJECTED,
          adminMessage: adminMessage
        }).then(() => {
          // Create and send notification to user
          kue.createSendShopOpeningRequestNotificationJob({shopOpeningRequestId: this.id});

          // Send email to requester
          kue.createEmailJob({
            template: emailer.EMAIL_TEMPLATE.RESPONSE_SHOP_OPENING_REQUEST,
            data: { shopOpeningRequestId: this.id }
          });
          return Promise.resolve();
        });
      }
    }
  });
  
  ShopOpeningRequest.STATUS = SHOP_OPENING_REQUEST_STATUS;

  return ShopOpeningRequest;
};
