'use strict';

const imageUploader = require('../libs/image-uploader');
const _ = require('lodash');

var IGNORE_ATTRIBUTES = [
  'updatedAt',
  'createdAt'
];


module.exports = function(sequelize, DataTypes) {
  let Item = sequelize.define('Item', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50]
      }
    },
    description: {
      type: DataTypes.STRING,
      validate: {
        len: [1, 125]
      }
    },
    sort: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    image: {
      type: DataTypes.STRING
    },
    imageFile: {
      type: DataTypes.JSON
    },
    quantity: {
      type: DataTypes.INTEGER
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    shopId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    hooks: {
      afterDestroy: function(item, options) {
        if (item.imageFile && _.isArray(item.imageFile.versions)) {
          return imageUploader.deleteImages(item.avatarFile.versions);
        }
      }
    },
    classMethods: {
      associate: function(models) {
        Item.belongsTo(models.Shop, {
          foreignKey: 'shopId'
        });
        Item.belongsTo(models.Category, {
          foreignKey: 'categoryId'
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
  
  Item.MAXIMUM_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
  
  return Item;
};
