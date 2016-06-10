'use strict';

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
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: SHOP_OPENING_REQUEST_STATUS.PENDING
    }
  }, {
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
      }
    }
  });
  
  ShopOpeningRequest.STATUS = SHOP_OPENING_REQUEST_STATUS;

  return ShopOpeningRequest;
};
