'use strict';

const bcrypt = require('bcrypt');

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.bulkInsert('Users', [{
      email: 'longnh1994@gmail.com',
      password: bcrypt.hashSync('12345678', parseInt(process.env.PASSWORD_SALT_ROUND)),
      fullName: 'Long Nguyen',
      admin: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: function (queryInterface, Sequelize) {

  }
};
