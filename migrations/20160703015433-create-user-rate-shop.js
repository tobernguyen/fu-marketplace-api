'use strict';

module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('Reviews', {
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
      rate: {
        type: Sequelize.INTEGER
      },
      comment: {
        type: Sequelize.STRING
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
      let sql = `CREATE UNIQUE INDEX "UserIdShopIdUniqueIndexOnReviews"
                  ON public."Reviews"
                  USING btree
                  ("userId", "shopId");
                `;
      return queryInterface.sequelize.query(sql, {raw: true});
    }).then(() => {
      let sql = `CREATE INDEX "ShopIdCreatedAtIndexOnReviews"
                  ON public."Reviews"
                  USING btree
                  ("shopId", "createdAt");           
                `;
      return queryInterface.sequelize.query(sql, {raw: true});
    });
  },
  down: function(queryInterface, Sequelize) {
    return queryInterface.dropTable('Reviews');
  }
};
