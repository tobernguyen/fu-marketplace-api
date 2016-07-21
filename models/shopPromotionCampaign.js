'use strict';

var _ = require('lodash');

var IGNORE_ATTRIBUTES = [
  'updatedAt',
  'createdAt'
];

const TYPE = {
  TOP_FEED_SLIDE_SHOW: 1
};

module.exports = function(sequelize, DataTypes) {
  let ShopPromotionCampaign = sequelize.define('ShopPromotionCampaign', {
    ownerId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    },
    shopId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      references: {
        model: 'Shops',
        key: 'id'
      },
      onUpdate: 'cascade',
      onDelete: 'cascade'
    },
    startDate: {
      allowNull: false,
      type: DataTypes.DATE,
      validate: {
        isDate: true
      }
    },
    endDate: {
      allowNull: false,
      type: DataTypes.DATE,
      validate: {
        isDate: true
      }
    },
    type: {
      allowNull: false,
      type: DataTypes.INTEGER,
      validate: {
        isIn: [_.values(TYPE)]
      }
    },
    active: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    validate: {
      endDateIsAfterStartDate: function() {
        if (this.endDate < this.startDate) throw new Error('End Date must after Start Date');
      }
    },
    defaultScope: {
      order: '"id" DESC'
    },
    scopes: {
      validTopFeedSlideShow: function() {
        return {
          where: {
            type: TYPE.TOP_FEED_SLIDE_SHOW,
            startDate: {
              $lte: new Date()
            },
            endDate: {
              $gt: new Date()
            },
            active: true
          },
          include: {
            model: sequelize.model('Shop'),
            attributes: ['id', 'name', 'description', 'cover']
          }
        };
      }
    },
    classMethods: {
      associate: function(models) {
        ShopPromotionCampaign.belongsTo(models.User, {
          foreignKey: 'ownerId'
        });
        ShopPromotionCampaign.belongsTo(models.Shop, {
          foreignKey: 'shopId'
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

  ShopPromotionCampaign.TYPE = TYPE;

  return ShopPromotionCampaign;
};
