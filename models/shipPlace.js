'use strict';

module.exports = function(sequelize, DataTypes) {
  let clearMetadataCache = () => {
    let cacheManager = require('../libs/cache-manager');
    return cacheManager.del(cacheManager.CACHE_KEYS.CONTROLLER_GET_METADATA);
  };

  let ShipPlace = sequelize.define('ShipPlace', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    hooks: {
      afterCreate: clearMetadataCache,
      afterUpdate: clearMetadataCache,
      afterDelete: clearMetadataCache
    },
    classMethods: {
      associate: function(models) {
        ShipPlace.belongsToMany(models.Shop, {through: 'ShopShipPlaces'});
      }
    }
  });
  return ShipPlace;
};
