'use strict';

const Promise = require('bluebird');
const bcrypt = Promise.promisifyAll(require('bcrypt'));

const saltRound = parseInt(process.env.PASSWORD_SALT_ROUND);
const hashPassword = (password) => {
  return bcrypt.hashAsync(password, saltRound);
};
const imageUploader = require('../libs/image-uploader');
const _ = require('lodash');

var IGNORE_ATTRIBUTES = [
  'password',
  'updatedAt',
  'createdAt',
  'acceptTokenAfter',
  'googleId',
  'avatarFile',
  'identityPhotoFile'
];

var ALL_SELLER_INFO_FIELD = [
  'id',
  'fullName',
  'phone',
  'email',
  'avatar',
  'identityNumber'
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
    avatarFile: {
      type: DataTypes.JSON
    },
    identityPhotoFile: {
      type: DataTypes.JSON
    }
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
      },
      afterDestroy: function(user, options) {
        var promises = [];

        // Delete user's avatar files
        if (user.avatarFile && _.isArray(user.avatarFile.versions)) {
          promises.push(imageUploader.deleteImages(user.avatarFile.versions));
        }

        // Delete user's identity photo files
        if (user.identityPhotoFile && _.isArray(user.identityPhotoFile.versions)) {
          promises.push(imageUploader.deleteImages(user.identityPhotoFile.versions));
        }

        if (promises.length) {
          return Promise.all(promises);
        }
      }
    },
    classMethods: {
      associate: function(models) {
        User.belongsToMany(models.Role, {through: 'UserRoles'});
        User.hasMany(models.Shop, {
          foreignKey: 'ownerId',
          constraints: false
        });
        User.hasMany(models.Order, {
          foreignKey: 'userId',
          constraints: false
        });
        User.hasMany(models.UserNotification, {
          foreignKey: 'userId',
          constraints: false
        });
        User.hasMany(models.Review, {
          foreignKey: 'userId',
          constraints: false
        });
        User.hasMany(models.ShopPromotionCampaign, {
          foreignKey: 'ownerId',
          constraints: false
        });
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
      getAllSellerInfo: function() {
        var result = {};

        _.each(ALL_SELLER_INFO_FIELD, fieldName => {
          result[fieldName] = this[fieldName];
        });

        if (this.identityPhotoFile && _.isArray(this.identityPhotoFile.versions)) {
          result['identityPhoto'] = this.identityPhotoFile.versions[0].Url;
        } else {
          result['identityPhoto'] = '';
        }

        return result;
      },
      verifyPassword: function(inputPassword) {
        return bcrypt.compareAsync(inputPassword, this.password);
      },
      signOutAll: function() {
        return this.update({acceptTokenAfter: new Date()});
      },
      verifyRole: function(roleName) {
        return this.getRoles().then(roles => {
          return Promise.resolve(_.findIndex(roles, r => r.name === roleName) !== -1); 
        });
      },
      verifyRoleCapability: function(roles) {
        let promise = new Promise((resolve, reject) => {
          let error;
          let isValid = roles.every(r => {
            switch(r.name) {
              case 'seller':
                if (!this.identityNumber || !this.identityPhotoFile || !this.phone) {
                  error = 'User is not capable of becoming seller';
                  return false;
                }
              default:
                return true;
            }
          });

          isValid ? resolve(true) : reject(error);
        });

        return promise;
      }
    }
  });
  
  User.MAXIMUM_AVATAR_SIZE = 3 * 1024 * 1024; // 3MB
  User.MAXIMUM_IDENTITY_PHOTO_SIZE = 6 * 1024 * 1024; // 6MB
  
  return User;
};
