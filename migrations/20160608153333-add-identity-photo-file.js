'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.addColumn(
      'Users',
      'identityPhotoFile',
      Sequelize.JSON
    );
  },
  down: function (queryInterface, Sequelize) {
    queryInterface.removeColumn('Users', 'identityPhotoFile');
  }
};
