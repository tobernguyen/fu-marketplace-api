module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.createTable('ShopOpeningRequests', {
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
        type: Sequelize.STRING,
        allowNull: false
      },
      note: {
        type: Sequelize.TEXT
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
      return queryInterface.sequelize.query('CREATE INDEX "ShopOpeningRequestsOwnerIdIndex" ON public."ShopOpeningRequests" ("ownerId")', {raw: true});
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('ShopOpeningRequests');
  }
};
