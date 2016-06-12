'use strict';

var dotenv = require('dotenv');
dotenv.load({ path: `.env.${process.env.NODE_ENV || 'development'}` });

var Promise = require('bluebird');
var Sequelize = require('sequelize');
var models = require('../models');
var _sequelize = models.sequelize;
var assert = require('assert');
var faker = require('faker');
var Umzug = require('umzug');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var jwt = require('jsonwebtoken');
var expect = chai.expect;
require('sinon');
require('sinon-as-promised');
var fs = require('fs-extra');

before(done => {
  dbUtils.runMigrations()
    .then(dbUtils.clearDatabase)
    .then(() => done(), done);
});

after(() => {
  _sequelize.close();
  fs.emptyDirSync('public/uploads/__test__');
});

var dbUtils = {
  runMigrations: () => {
    var umzug = new Umzug({
      storage: 'sequelize',
      storageOptions: {
        sequelize: _sequelize
      },
      migrations: {
        params: [_sequelize.getQueryInterface(), Sequelize],
        path: 'migrations'
      }
    });
    return umzug.up();
  },
  clearDatabase: () => {
    return Sequelize.Promise.each(
      Object.keys(models), function (modelName) {
        if (models[modelName] instanceof _sequelize.Model) {
          return models[modelName].destroy({
            where: Sequelize.literal('1=1'),
            truncate: true,
            cascade: true,
            force: true
          });
        }
      }
    );
  }
};

// Define factory
const createModel = (modelName, attrs) => {
  if (attrs == undefined) attrs = {};
  
  let Model = models[modelName];
  assert(Model, 'cannot get model of name ' + modelName + ' from app.models');
  
  return Model.create(attrs);
};

var createUser = (attrs) => {
  if (attrs == undefined) attrs = {};

  let password = attrs.password || faker.internet.password();
  return createModel('User', {
    fullName: attrs.fullname || faker.name.findName(),
    email: attrs.email || faker.internet.email(),
    password: password,
    avatarFile: attrs.avatarFile,
    identityPhotoFile: attrs.identityPhotoFile
  }).then(u => {
    u['__test__'] = {password: password}; // inject testing data into user object
    return Promise.resolve(u);
  });
};

const assignRoleToUser = (user, roleName) => {
  assert(user, 'user cannot be blank');
  assert(roleName, 'roleName cannot be blank');
  
  let Role = models.Role;
  return Role.findOrCreate({where: {name: roleName}}).then(role => {
    return user.addRole(role[0]);
  }).then(() => Promise.resolve(user));
};

const createUserWithRole = (attrs, roleName) => {
  let createdUser;
  
  return createUser(attrs).then(user => {
    createdUser = user;
    
    return assignRoleToUser(user, roleName);
  }).then(() => {
    return Promise.resolve(createdUser);
  });
};

var createAccessTokenForUserId = (userId) => {
  return jwt.sign({id: userId}, process.env.TOKEN_SECRET, {
    expiresIn: 60 * 24 * 60 * 60
  });
};

var createShop = (attrs, id) => {
  if (attrs == undefined) attrs = {};

  return createModel('Shop', {
    name: attrs.name || faker.name.findName(),
    description: attrs.description || faker.lorem.sentence(),
    avatar: attrs.avatar || faker.image.imageUrl(),
    avatarFile: attrs.avatarFile,
    cover: attrs.avatar || faker.image.imageUrl(),
    coverFile: attrs.coverFile,
    banned: attrs.banned,
    ownerId: id
  });
};

var addShipPlaceToShop = (shop, shipPlace) => {
  assert(shop, 'shop cannot be blank');
  assert(shipPlace, 'shipPlace cannot be blank');
  
  return createShipPlace(shipPlace).then(shipPlace => {
    return shop.addShipPlace(shipPlace[0]);
  }).then(() => Promise.resolve(shop));
};

var createShipPlace = (shipPlace) => {
  assert(shipPlace, 'shipPlace cannot be blank');
  let ShipPlace = models.ShipPlace;
  return ShipPlace.findOrCreate({where: {name: shipPlace}});
};

var createShopWithShipPlace = (attrs, id, shipPlace) => {
  let createdShop;
  
  return createShop(attrs, id).then(s => {
    createdShop = s;
    
    return addShipPlaceToShop(s, shipPlace);
  }).then(() => {
    return Promise.resolve(createdShop);
  });
};

exports.createAccessTokenForUserId = createAccessTokenForUserId;
exports.dbUtils = dbUtils;
exports.factory = {
  createUser: createUser,
  assignRoleToUser: assignRoleToUser,
  createUserWithRole: createUserWithRole,
  createShopWithShipPlace: createShopWithShipPlace,
  addShipPlaceToShop: addShipPlaceToShop,
  createShop: createShop,
  createShipPlace: createShipPlace
};

// Setup some global helper
global.expect = expect;
