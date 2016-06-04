'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Users',
      'avatarFile',
      Sequelize.JSON
    );
  },

  down: function (queryInterface, Sequelize) {
    queryInterface.removeColumn('Users', 'avatarFile');
  }
};
