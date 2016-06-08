'use strict';

var IGNORE_ATTRIBUTES = [
  'updatedAt',
  'createdAt'
];

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
    }
  }, {
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
  
  return ShopOpeningRequest;
};
