'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.addColumn(
      'Users',
      'avatar',
      Sequelize.STRING
    );
    queryInterface.addColumn(
      'Users',
      'room',
      Sequelize.STRING
    );
    queryInterface.addColumn(
      'Users',
      'phone',
      Sequelize.STRING
    );
    queryInterface.addColumn(
      'Users',
      'ban',
      Sequelize.BOOLEAN
    );
    queryInterface.addColumn(
      'Users',
      'gender',
      Sequelize.STRING
    );
  },
  down: function (queryInterface, Sequelize) {
    queryInterface.removeColumn('Users', 'avatar');
    queryInterface.removeColumn('Users', 'room');
    queryInterface.removeColumn('Users', 'phone');
    queryInterface.removeColumn('Users', 'ban');
    queryInterface.removeColumn('Users', 'gender');
  }
};
