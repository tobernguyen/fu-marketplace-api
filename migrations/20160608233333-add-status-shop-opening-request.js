'use strict';

var ShopOpeningRequest = require('../models').ShopOpeningRequest;

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.addColumn(
      'ShopOpeningRequests',
      'status',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: ShopOpeningRequest.STATUS.PENDING
      }
    );
  },
  down: function (queryInterface, Sequelize) {
    queryInterface.removeColumn('ShopOpeningRequests', 'status');
  }
};
