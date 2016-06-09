'use strict';

var Shop = require('../models').Shop;

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Shops',
      'address',
      {
        type: Sequelize.STRING
      }
    ).then(() => {
      return queryInterface.addColumn(
        'Shops',
        'status',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: Shop.STATUS.UNPUBLISHED
        }
      );
    });
  },
  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Shops', 'status').then(() => {
      return queryInterface.removeColumn('Shops', 'address');
    });
  }
};
