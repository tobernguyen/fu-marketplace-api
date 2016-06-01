'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Users',
      'identityNumber',
      Sequelize.STRING
    ).then(() => {
      return queryInterface.renameColumn(
        'Users',
        'ban',
        'banned'
      );
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.renameColumn(
      'Users', 
      'banned', 
      'ban'
      ).then(() => {
        return queryInterface.removeColumn(
          'Users', 
          'identityNumber'
        );
    });
  }
};
