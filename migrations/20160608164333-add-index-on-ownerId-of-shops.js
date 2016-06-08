module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('CREATE INDEX "ShopOwnerIdIndex" ON public."Shops" ("ownerId")', {raw: true});
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeIndex('Shops', 'ownerId');
  }
};
