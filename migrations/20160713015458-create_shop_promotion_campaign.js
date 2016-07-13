'use strict';

module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('ShopPromotionCampaigns', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      ownerId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'cascade',
        onDelete: 'cascade'
      },
      shopId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: 'Shops',
          key: 'id'
        },
        onUpdate: 'cascade',
        onDelete: 'cascade'
      },
      startDate: {
        allowNull: false,
        type: Sequelize.DATE
      },
      endDate: {
        allowNull: false,
        type: Sequelize.DATE
      },
      type: {
        allowNull: false,
        type: Sequelize.DATE
      },
      active: {
        allowNull: false,
        type: Sequelize.BOOLEAN
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
      let sql = `CREATE INDEX "Type_StartDate_EndDateCompoundIndex"
                  ON public."ShopPromotionCampaigns"
                  USING btree
                  ("type", "startDate", "endDate");
                  CREATE INDEX "ShopIdIndex"
                  ON public."ShopPromotionCampaigns"
                  USING btree
                  ("shopId");
                  CREATE INDEX "ShopIdIndex"
                  ON public."ShopPromotionCampaigns"
                  USING btree
                  ("ownerId");
                `;
      return queryInterface.sequelize.query(sql, {raw: true});
    });
  },
  down: function(queryInterface, Sequelize) {
    return queryInterface.dropTable('ShopPromotionCampaigns');
  }
};
