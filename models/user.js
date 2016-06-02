'use strict';

const Promise = require('bluebird');
const bcrypt = Promise.promisifyAll(require('bcrypt'));

const saltRound = parseInt(process.env.PASSWORD_SALT_ROUND);
const hashPassword = (password) => {
  return bcrypt.hashAsync(password, saltRound);
};

var IGNORE_ATTRIBUTES = [
  'password', 
  'updatedAt', 
  'createdAt', 
  'acceptTokenAfter', 
  'ban', 
  'googleId'
];

module.exports = function(sequelize, DataTypes) {
  let User = sequelize.define('User', {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 255]
      }
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 50]
      }
    },
    acceptTokenAfter: {
      type: DataTypes.DATE
    },
    googleId: {
      type: DataTypes.STRING
    },
    phone: {
      type: DataTypes.STRING,
      validate: {
        isNumeric: true
      }
    },
    room: {
      type: DataTypes.STRING
    },
    avatar: {
      type: DataTypes.STRING
    },
    gender: {
      type: DataTypes.STRING
    },
    banned: {
      type: DataTypes.BOOLEAN
    },
    identityNumber: {
      type: DataTypes.STRING,
      validate: {
        isNumeric: true,
        len: [9,12]
      }
    },
  }, {
    hooks: {
      beforeCreate: function(user, options) {
        return hashPassword(user.password).then(hashedPassword => {
          user.password = hashedPassword;
        });
      },
      beforeUpdate: function(user, options) {
        if (!user.changed('password')) return;
        return hashPassword(user.password).then(hashedPassword => {
          user.password = hashedPassword;
        });
      }
    },
    classMethods: {
      associate: function(models) {
        User.belongsToMany(models.Role, {through: 'UserRoles'});
      }
    },
    instanceMethods: {
      toJSON: function () {
        var values = this.get();
        
        IGNORE_ATTRIBUTES.forEach(attr => {
          delete values[attr];
        });
        
        return values;
      },
      verifyPassword: function(inputPassword) {
        return bcrypt.compareAsync(inputPassword, this.password);
      },
      signOutAll: function() {
        return this.update({acceptTokenAfter: new Date()});
      }
    }
  });
  return User;
};
