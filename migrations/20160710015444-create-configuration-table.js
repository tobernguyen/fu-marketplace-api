'use strict';

module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('Configurations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      key: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: true
      },
      value: {
        allowNull: false,
        type: Sequelize.JSON
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
      let sql = `CREATE UNIQUE INDEX "KeyUniqueIndexOnConfigurations"
                  ON public."Configurations"
                  USING btree
                  ("key");
                `;
      return queryInterface.sequelize.query(sql, {raw: true});
    }).then(() => {
      let Configuration = require('../models').Configuration;
      return Configuration.set(Configuration.KEYS.SHOP_REQUEST_MAILING_LIST, ['longnh1994@gmail.com']);
    });
  },
  down: function(queryInterface, Sequelize) {
    return queryInterface.dropTable('Configurations');
  }
};
