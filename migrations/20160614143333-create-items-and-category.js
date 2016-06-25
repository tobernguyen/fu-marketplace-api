'use strict';

const models = require('../models');

module.exports = {
  up: function(queryInterface, Sequelize) {
    return queryInterface.createTable('Categories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
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
      return models.Category.bulkCreate([{
        name: 'Đồ ăn vặt'
      },{
        name: 'Đồ uống'
      },{
        name: 'Cơm'
      },{
        name: 'Bánh mỳ'
      },{
        name: 'Dịch vụ'
      },{
        name: 'Khác'
      }]);
    }).then(() => {
      return queryInterface.createTable('Items', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        description: {
          type: Sequelize.STRING
        },
        sort: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        price: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        image: {
          type: Sequelize.STRING  
        },
        imageFile: {
          type: Sequelize.JSON
        },
        quantity: {
          type: Sequelize.INTEGER
        },
        categoryId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Categories',
            key: 'id'
          },
          onUpdate: 'cascade'
        },
        shopId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Shops',
            key: 'id',
            deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE
          },
          onUpdate: 'cascade',
          onDelete: 'cascade'
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
      let sql = `CREATE INDEX "ItemShopIndex"
                  ON public."Items"
                  USING btree
                  ("shopId");
                `;
      return queryInterface.sequelize.query(sql, {raw: true});
    }).then(() => {
      let sql = `CREATE INDEX "ItemCategoryIndex"
                  ON public."Items"
                  USING btree
                  ("categoryId");
                `;
      return queryInterface.sequelize.query(sql, {raw: true});
    });
  },
  down: function(queryInterface, Sequelize) {
    return queryInterface.removeIndex(
      'Items', 
      'ItemCategoryIndex'
      ).then(() => {
        return queryInterface.removeIndex(
        'Items', 
        'ItemShopIndex'
        );
      }).then(() => {
        return queryInterface.dropTable('Items');
      }).then(() => {
        return queryInterface.dropTable('Categories');
      });
  }
};
