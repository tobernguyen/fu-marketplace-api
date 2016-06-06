'use strict';

const models = require('../models');

module.exports = {
  up: function (queryInterface, Sequelize) {
    var user, shop;
    
    return models.User.create({
      email: 'sonht@gmail.com',
      password: '12345678',
      fullName: 'Son Hoang'
    }).then(function(u) {
      user = u;
      return models.Role.findOne({
        where: {
          name: 'seller'
        }
      });
    }).then(function(role) {
      return user.addRole(role);
    }).then(() => {
      return models.Shop.create({
        name: 'Bánh mì dân tổ',
        description: 'Bánh mì dân tổ',
        avatar: '',
        cover: '',
        ownerId: user.id
      });
    }).then(function(s) {
      shop = s;
      return models.ShipPlace.findAll();
    }).then(function(shipplaces) {
      return shop.setShipPlaces(shipplaces);
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('ShopShipPlaces', {}).then(() => {
      return queryInterface.bulkDelete('Shops', {});
    }).then(() => {
      return models.User.destroy({
        where: {
          email: {
            $not: 'longnh1994@gmail.com'
          }
        }
      });
    });
  }
};
