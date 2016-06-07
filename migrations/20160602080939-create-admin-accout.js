'use strict';

const models = require('../models');

module.exports = {
  up: function (queryInterface, Sequelize) {
    var user;
    
    return models.User.create({
      email: 'longnh1994@gmail.com',
      password: '12345678',
      fullName: 'Long Nguyen'
    }).then(function(u) {
      user = u;
      return models.Role.create({
        name: 'admin'
      });
    }).then(function(role) {
      return user.addRole(role);
    }).then(() => {
      return models.Role.create({
        name: 'seller'
      });
    });
  },

  down: function (queryInterface, Sequelize) {
    
    return queryInterface.bulkDelete('UserRoles', {}).then(() => {
      return queryInterface.bulkDelete('Roles', {});
    }).then(() => {
      return queryInterface.bulkDelete('Users', {});
    });
  }
};
