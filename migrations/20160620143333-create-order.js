'use strict';

const models = require('../models');
var Order = models.Order;
var OrderLine = models.OrderLine;

module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('Orders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'cascade'
      },
      shopId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Shops',
          key: 'id'
        },
        onUpdate: 'cascade'
      },
      note: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: Order.STATUS.NEW
      },
      shipAddress: {
        type: Sequelize.STRING,
        allowNull: false
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
      return queryInterface.createTable('OrderLines', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        orderId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: 'Orders',
            key: 'id'
          },
          onUpdate: 'cascade'
        },
        item: {
          type: Sequelize.JSON,
          allowNull: false
        },
        note: {
          type: Sequelize.STRING
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: OrderLine.DEFAULT_QUANTITY
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      });
    }).then(() => {
      let sql = `CREATE INDEX "ShopUserOnOrderComposeIndex"
                  ON public."Orders"
                  USING btree
                  ("userId", "shopId");
                `;
      return queryInterface.sequelize.query(sql, {raw: true});
    }).then(() => {
      let sql = `CREATE INDEX "OrderOnOrderLinesIndex"
                  ON public."OrderLines"
                  USING btree
                  ("orderId");
                `;
      return queryInterface.sequelize.query(sql, {raw: true});
    });
  },
  down: function(queryInterface, Sequelize) {
    return queryInterface.removeIndex(
      'Orders', 
      'ShopUserOnOrderComposeIndex'
      ).then(() => {
        return queryInterface.removeIndex(
        'OrderLines', 
        'OrderOnOrderLinesIndex'
        );
      }).then(() => {
        return queryInterface.dropTable('OrderLines');
      }).then(() => {
        return queryInterface.dropTable('Orders');
      });
  }
};
