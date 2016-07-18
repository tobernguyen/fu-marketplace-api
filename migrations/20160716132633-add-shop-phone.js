'use strict';

const models = require('../models');
const _ = require('lodash');

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'ShopOpeningRequests',
      'phone',
      {
        type: Sequelize.STRING
      }
    ).then(() => {
      return queryInterface.addColumn(
        'Shops',
        'phone',
        {
          type: Sequelize.STRING
        }
      );
    }).then(() => {
      return models.ShopOpeningRequest.findAll();
    }).then(requests => {
      let promises = [];
      _.forEach(requests, function(value, key) {
        promises[key] = value.getUser().then(u => {
          return value.update({
            phone: u.phone
          });
        });
      });
      return Promise.all(promises);
    }).then((x) => {
      return models.Shop.findAll();
    }).then(shop => {
      let promises = [];
      _.forEach(shop, function(value, key) {
        promises[key] = value.getUser().then(u => {
          return value.update({
            phone: u.phone
          });
        });
      });
      return Promise.all(promises);
    }).then(() => {
      let sql = `ALTER TABLE public."ShopOpeningRequests" ALTER COLUMN "phone" SET NOT NULL;
                `;
      return queryInterface.sequelize.query(sql, {raw: true});
    }).then(() => {
      let sql = `ALTER TABLE public."Shops" ALTER COLUMN "phone" SET NOT NULL;
                `;
      return queryInterface.sequelize.query(sql, {raw: true});
    });
  },
  
  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('ShopOpeningRequests', 'phone').then(() => {
      queryInterface.removeColumn('Shops', 'phone');
    });
  }
};
