'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.addColumn(
      'Users',
      'acceptTokenAfter',
      Sequelize.DATE
    );
  },
  down: function (queryInterface, Sequelize) {
    queryInterface.removeColumn('Users', 'acceptTokenAfter');
  }
};
