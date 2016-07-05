'use strict';

module.exports = function(sequelize, DataTypes) {
  let Review = sequelize.define('Review', {
    userId: {
      allowNull: false,
      type: DataTypes.INTEGER
    },
    shopId: {
      allowNull: false,
      type: DataTypes.INTEGER
    },
    rate: {
      type: DataTypes.INTEGER,
      validate: {
        isIn: [[1, 2, 3, 4, 5]]   
      },
      allowNull: false,
      defaultValue: 3
    },
    comment: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 255]
      },
      allowNull: false,
      defaultValue: ''
    }
  }, {
    classMethods: {
      associate: function(models) {
        Review.belongsTo(models.Shop, {
          foreignKey: 'shopId'
        });
        Review.belongsTo(models.User, {
          foreignKey: 'userId'
        });
      }
    },
    instanceMethods: {
      toJSON: function () {
        return this.get();
      }
    }
  });

  return Review;
};
