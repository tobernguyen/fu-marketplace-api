'use strict';

var IGNORE_ATTRIBUTES = [
  'updatedAt',
  'createdAt'
];

const DEFAULT_QUANTITY = 1;

module.exports = function(sequelize, DataTypes) {
  let OrderLine = sequelize.define('OrderLine', {
    orderId: {
      allowNull: false,
      type: DataTypes.INTEGER
    },
    item: {
      type: DataTypes.JSON,
      allowNull: false
    },
    note: {
      type: DataTypes.STRING
    },
    quantity: {
      type: DataTypes.INTEGER,
      validate: {
        min: DEFAULT_QUANTITY
      },
      allowNull: false,
      defaultValue: DEFAULT_QUANTITY
    }
  }, {
    classMethods: {
      associate: function(models) {
        OrderLine.belongsTo(models.Order, {
          foreignKey: 'orderId'
        });
      }
    },
    instanceMethods: {
      toJSON: function () {
        var values = this.get();
        
        IGNORE_ATTRIBUTES.forEach(attr => {
          delete values[attr];
        });

        return values;
      }
    }
  });
    
  OrderLine.DEFAULT_QUANTITY = DEFAULT_QUANTITY;

  return OrderLine;
};
