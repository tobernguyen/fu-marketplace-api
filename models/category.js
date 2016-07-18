'use strict';

var IGNORE_ATTRIBUTES = [
  'updatedAt',
  'createdAt'
];

module.exports = function(sequelize, DataTypes) {
  let clearMetadataCache = () => {
    let cacheManager = require('../libs/cache-manager');
    return cacheManager.del(cacheManager.CACHE_KEYS.CONTROLLER_GET_METADATA);
  };

  let Category = sequelize.define('Category', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING
    }
  }, {
    hooks: {
      afterCreate: clearMetadataCache,
      afterUpdate: clearMetadataCache,
      afterDelete: clearMetadataCache
    },
    classMethods: {
      associate: function(models) {
        Category.hasMany(models.Item, {
          foreignKey: 'categoryId',
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
  return Category;
};
