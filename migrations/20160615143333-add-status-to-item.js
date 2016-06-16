'use strict';

var Item = require('../models').Item;

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.addColumn(
      'Items',
      'status',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: Item.STATUS.NOT_FOR_SELL
      }
    );
  },
  
  down: function (queryInterface, Sequelize) {
    queryInterface.removeColumn('Items', 'status');
  }
};
