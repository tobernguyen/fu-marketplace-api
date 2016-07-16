'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Shops',
      'averageRating',
      {
        type: Sequelize.FLOAT(2)
      }
    ).then(() => {
      // Update mapping for elasticsearch
      return require('../config/elasticsearch-migrations/20160716151806-add-average-rating-to-shop-mapping').up();
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Shops', 'averageRating');
  }
};
