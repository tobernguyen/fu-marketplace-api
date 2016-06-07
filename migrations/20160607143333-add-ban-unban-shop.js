'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.addColumn(
      'Shops',
      'banned',
      Sequelize.BOOLEAN
    );
  },
  down: function (queryInterface, Sequelize) {
    queryInterface.removeColumn('Shops', 'banned');
  }
};
