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
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Users', {}).then(() => {
      return queryInterface.bulkDelete('Roles', {});
    });
  }
};
