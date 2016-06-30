'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Orders',
      'rate',
      {
        type: Sequelize.INTEGER
      }
    ).then(() => {
      return queryInterface.addColumn(
        'Orders',
        'comment',
        {
          type: Sequelize.STRING
        }
      );
    });
  },
  
  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Orders', 'comment').then(() => {
      return queryInterface.removeColumn('Orders', 'rate');
    });
  }
};
