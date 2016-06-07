'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.createTable('Shops', {
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
        type: Sequelize.STRING,
        allowNull: false
      },
      avatar: {
        type: Sequelize.STRING,
        allowNull: false
      },
      cover: {
        type: Sequelize.STRING,
        allowNull: false
      },
      opening: {
        type: Sequelize.BOOLEAN
      },
      avatarFile: {
        type: Sequelize.JSON
      },
      coverFile: {
        type: Sequelize.JSON
      },
      ownerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
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
    }).then(() => {
      return queryInterface.createTable('ShopShipPlaces', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        ShopId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Shops',
            key: 'id'
          },
          onUpdate: 'cascade',
          onDelete: 'cascade'
        },
        ShipPlaceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'ShipPlaces',
            key: 'id'
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
      return queryInterface.addIndex(
        'ShopShipPlaces',
        ['ShopId', 'ShipPlaceId'],
        {
          indexName: 'ShopShipPlaceCompoundIndex',
          indicesTypes: 'UNIQUE'
        }
      );
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeIndex(
      'ShopShipPlaces', 
      'ShopShipPlaceCompoundIndex'
      ).then(() => {
        return queryInterface.dropTable('ShopShipPlaces');
      }).then(() => {
        return queryInterface.dropTable('Shops');
      });
  }
};
