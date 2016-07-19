'use strict';

const models = require('../models');
var Ticket = models.Ticket;


module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('Tickets', {
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
        onUpdate: 'cascade',
        onDelete: 'cascade'
      },
      userNote: {
        type: Sequelize.TEXT
      },
      adminComment: {
        type: Sequelize.TEXT
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: Ticket.STATUS.OPENING
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
      let sql = `CREATE INDEX "TicketIdOrderIdIndexOnTickets"
                  ON public."Tickets"
                  USING btree
                  ("id", "orderId");
                `;
      return queryInterface.sequelize.query(sql, {raw: true});
    });
  },
  down: function(queryInterface, Sequelize) {
    return queryInterface.dropTable('Tickets');
  }
};
