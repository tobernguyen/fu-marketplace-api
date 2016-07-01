'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Orders',
      'sellerMessage',
      {
        type: Sequelize.STRING
      }
    );
  },
  
  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Orders', 'sellerMessage');
  }
};
