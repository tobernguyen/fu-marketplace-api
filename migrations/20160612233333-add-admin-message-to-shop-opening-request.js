'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.addColumn(
      'ShopOpeningRequests',
      'adminMessage',
      {
        type: Sequelize.TEXT
      }
    );
  },
  down: function (queryInterface, Sequelize) {
    queryInterface.removeColumn('ShopOpeningRequests', 'adminMessage');
  }
};
