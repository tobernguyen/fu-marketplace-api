'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.createTable('Roles', {
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
      return queryInterface.createTable('UserRoles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        UserId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'cascade',
          onDelete: 'cascade'
        },
        RoleId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Roles',
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
        'UserRoles',
        ['UserId', 'RoleId'],
        {
          indexName: 'UserRoleCompoundIndex',
          indicesTypes: 'UNIQUE'
        }
      );
    }).then(() => {
      return queryInterface.removeColumn('Users', 'seller');
    }).then(() => {
      return queryInterface.removeColumn('Users', 'admin');
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('UserRoles').then(() => {
      return queryInterface.dropTable('Roles');
    }).then(() => {
      return queryInterface.addColumn(
        'Users',
        'seller',
        Sequelize.BOOLEAN
      );
    }).then(() => {
      return queryInterface.addColumn(
        'Users',
        'admin',
        Sequelize.BOOLEAN
      );
    });
  }
};
