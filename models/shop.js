'use strict';

const imageUploader = require('../libs/image-uploader');
const _ = require('lodash');

var IGNORE_ATTRIBUTES = [
  'updatedAt',
  'createdAt',
  'avatarFile',
  'coverFile'
];

module.exports = function(sequelize, DataTypes) {
  let Shop = sequelize.define('Shop', {
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
    avatar: {
      type: DataTypes.STRING
    },
    cover: {
      type: DataTypes.STRING
    },
    opening: {
      type: DataTypes.BOOLEAN
    },
    avatarFile: {
      type: DataTypes.JSON
    },
    coverFile: {
      type: DataTypes.JSON
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    banned: {
      type: DataTypes.BOOLEAN
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    hooks: {
      afterDestroy: function(shop, options) {
        // Delete shop's avatar files
        if (shop.avatarFile && _.isArray(shop.avatarFile.versions)) {
          return imageUploader.deleteImages(shop.avatarFile.versions);
        }
        
        if (shop.coverFile && _.isArray(shop.coverFile.versions)) {
          return imageUploader.deleteImages(shop.coverFile.versions);
        }
      }
    },
    classMethods: {
      associate: function(models) {
        Shop.belongsToMany(models.ShipPlace, {through: 'ShopShipPlaces'});
        Shop.belongsTo(models.User, {
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
  
  Shop.MAXIMUM_AVATAR_SIZE = 3 * 1024 * 1024; // 3MB
  Shop.MAXIMUM_COVER_SIZE = 3 * 1024 * 1024; // 3MB
  Shop.STATUS = {
    PUBLISHED: 1,
    UNPUBLISHED: 0
  };
  
  return Shop;
};
