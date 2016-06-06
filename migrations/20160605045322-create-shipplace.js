'use strict';

const models = require('../models');

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.createTable('ShipPlaces', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    }).then(() => {
      return models.ShipPlace.bulkCreate([{
        name: 'Dom A'
      },{
        name: 'Dom B'
      },{
        name: 'Dom C'
      },{
        name: 'Dom D'
      },{
        name: 'Dom E'
      },{
        name: 'Dom F'
      }]);
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('ShipPlaces', {}).then(() => {
      return queryInterface.dropTable('ShipPlaces');
    });
  }
};
