'use strict';

const _ = require('lodash');

var TICKET_STATUS = {
  OPENING: 0,
  INVESTIGATING: 1,
  CLOSED: 2
};

module.exports = function(sequelize, DataTypes) {
  let Ticket = sequelize.define('Ticket', {
    orderId: {
      allowNull: false,
      type: DataTypes.INTEGER
    },
    userNote: {
      type: DataTypes.TEXT,
      validate: {
        len: [1, 65000]
      }
    },
    adminComment: {
      type: DataTypes.TEXT,
      validate: {
        len: [1, 65000]
      }
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: TICKET_STATUS.OPENING
    }
  }, {
    classMethods: {
      associate: function(models) {
        Ticket.belongsTo(models.Order, {
          foreignKey: 'orderId'
        });
      }
    },
    instanceMethods: {
      toJSON: function () {
        return this.get();
      },
      updateTicket: function(ticketInfo) {
        return new Promise((resolve, reject) => {
          let rawInfo = _.pick(ticketInfo, ['userNote']);

          if (!rawInfo.userNote) {
            rawInfo.userNote = '';
          }

          if (this.status === TICKET_STATUS.OPENING) {
            this.update({
              userNote: rawInfo.userNote
            }).then(resolve, reject);
          } else {
            let error = 'Only opening ticket has able to be edited';
            reject({
              status: 403,
              message: error,
              type: 'ticket'
            });
          }
        });
      },
      investigateTicket: function() {
        return new Promise((resolve, reject) => {
          if (this.status === TICKET_STATUS.OPENING) {
            this.update({
              status: TICKET_STATUS.INVESTIGATING
            }).then(resolve, reject);
          } else {
            let error = 'Only opening ticket has able to be started investigating';
            reject({
              status: 403,
              message: error,
              type: 'ticket'
            });
          }
        });
      },
      closeTicket: function (ticketInfo) {
        return new Promise((resolve, reject) => {
          let rawInfo = _.pick(ticketInfo, ['adminComment']);

          rawInfo.status = TICKET_STATUS.CLOSED;

          if (this.status === TICKET_STATUS.INVESTIGATING || this.status === TICKET_STATUS.OPENING) {
            this.update(rawInfo).then(resolve, reject);
          } else {
            let error = 'Only opening or investigating ticket has able to be closed';
            reject({
              status: 403,
              message: error,
              type: 'ticket'
            });
          }
        });
      },
      reopenTicket: function () {
        return new Promise((resolve, reject) => {
          if (this.status === TICKET_STATUS.CLOSED) {
            this.update({
              status: TICKET_STATUS.OPENING
            }).then(resolve, reject);
          } else {
            let error = 'Only closed ticket has able to be reopening';
            reject({
              status: 403,
              message: error,
              type: 'ticket'
            });
          }
        });
      }
    }
  });

  Ticket.STATUS = TICKET_STATUS;

  return Ticket;
};
