'use strict';

module.exports = function(sequelize, DataTypes) {
  let Role = sequelize.define('Role', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        Role.belongsToMany(models.User, {through: 'UserRoles'});
      }
    }
  });
  return Role;
};
