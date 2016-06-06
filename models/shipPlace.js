'use strict';

module.exports = function(sequelize, DataTypes) {
  let ShipPlace = sequelize.define('ShipPlace', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        ShipPlace.belongsToMany(models.Shop, {through: 'ShopShipPlaces'});
      }
    }
  });
  return ShipPlace;
};
