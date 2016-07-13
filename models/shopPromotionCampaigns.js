'use strict';

const TYPE = {
  TOP_FEED_SLIDESHOW: 1
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
      type: DataTypes.DATE
    },
    endDate: {
      allowNull: false,
      type: DataTypes.DATE
    },
    type: {
      allowNull: false,
      type: DataTypes.DATE
    },
    active: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    defaultScope: {
      order: '"id" DESC'
    }
  });

  ShopPromotionCampaign.TYPE = TYPE;

  return ShopPromotionCampaign;
};
