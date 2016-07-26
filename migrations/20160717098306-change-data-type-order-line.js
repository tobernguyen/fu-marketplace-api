'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    let sql = 'ALTER TABLE public."OrderLines" ALTER COLUMN "item" TYPE jsonb;';
    return queryInterface.sequelize.query(sql, {raw: true});
  },

  down: function (queryInterface, Sequelize) {
    let sql = 'ALTER TABLE public."OrderLines" ALTER COLUMN "item" TYPE json;';
    return queryInterface.sequelize.query(sql, {raw: true});
  }
};
