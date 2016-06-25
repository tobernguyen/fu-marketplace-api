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
var _ = require('lodash');
var elasticsearchHelper = require('./utils/elasticsearch-helper');


before(function(done) {
  this.timeout(5000);
  dbUtils.clearDatabase()
    .then(dbUtils.runMigrations)
    .then(elasticsearchHelper.deleteAll)
    .then(elasticsearchHelper.createIndexWithConfig)
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
    return _sequelize.query('DROP SCHEMA public CASCADE;create schema public;');
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
    phone: attrs.phone,
    avatar: attrs.avatar,
    avatarFile: attrs.avatarFile,
    identityNumber: attrs.identityNumber,
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

  if (roleName === 'seller') {
    attrs = _.assign(attrs, {
      phone: attrs.phone || '0987654321',
      identityNumber: attrs.identityNumber || 123456789,
      identityPhotoFile: attrs.identityPhotoFile || {
        versions: [
          {
            Url: faker.image.imageUrl(),
            Key: 'someRandomKey'
          }
        ]
      }
    });
  }
  
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

var createShop = (attrs) => {
  if (attrs == undefined) attrs = {};
  let createUserPromise;

  if (!attrs.ownerId) {
    createUserPromise = createUserWithRole({}, 'seller');
  } else {
    createUserPromise = Promise.resolve();
  }

  return createUserPromise.then(user => {
    return createModel('Shop', {
      name: attrs.name || faker.name.findName(),
      description: attrs.description || faker.lorem.sentence(),
      avatar: attrs.avatar || faker.image.imageUrl(),
      avatarFile: attrs.avatarFile,
      cover: attrs.avatar || faker.image.imageUrl(),
      coverFile: attrs.coverFile,
      banned: attrs.banned,
      ownerId: attrs.ownerId || user.id,
      opening: attrs.opening || false,
      status: attrs.status || models.Shop.STATUS.UNPUBLISHED
    });
  });
};

var addShipPlaceToShop = (shop, shipPlace) => {
  assert(shop, 'shop cannot be blank');
  assert(shipPlace, 'shipPlace cannot be blank');
  
  return createShipPlace(shipPlace).then(shipPlace => {
    return shop.addShipPlace(shipPlace[0]).then(() => {
      return shop.reindex();
    });
  }).then(() => Promise.resolve(shop));
};

var createShipPlace = (shipPlace) => {
  assert(shipPlace, 'shipPlace cannot be blank');
  let ShipPlace = models.ShipPlace;
  return ShipPlace.findOrCreate({where: {name: shipPlace}});
};

var createShopWithShipPlace = (attrs, shipPlace) => {
  let createdShop;
  
  return createShop(attrs).then(s => {
    createdShop = s;
    return addShipPlaceToShop(s, shipPlace);
  }).then(() => {
    return Promise.resolve(createdShop);
  });
};

var createShopOpeningRequest = (attrs) => {
  if (attrs == undefined) attrs = {};

  let createUserPromise;
  
  if (!attrs.ownerId) {
    createUserPromise = createUser().then(u => {
      return u.update({
        identityPhotoFile: {
          versions: [
            {
              Url: 'http://someurl.com',
              Key: 'someKey'
            }
          ]
        }
      });
    });
  } else {
    createUserPromise = Promise.resolve();
  }

  return createUserPromise.then(user => {
    return createModel('ShopOpeningRequest', {
      name: attrs.name || faker.name.findName(),
      description: attrs.description || faker.lorem.sentence(),
      note: attrs.note || '',
      ownerId: attrs.ownerId || user.id,
      address: attrs.address || faker.address.streetAddress(),
      status: attrs.status || 0 // Default is PENDING
    });
  });
};

var createItem = (attrs) => {
  if (attrs == undefined) attrs = {};

  let createShopPromise, findCategoryPromise;
  let Category = models.Category;
  let shopId;

  if (!attrs.shopId) {
    createShopPromise = createUserWithRole({}, 'seller').then(u => {
      return createShop({ userId: u.id});
    });
  } else {
    createShopPromise = Promise.resolve();
  }

  if (!attrs.categoryId) {
    findCategoryPromise = Category.findAll().then(categories => {
      return Promise.resolve(categories[0]);
    });
  } else {
    findCategoryPromise = Promise.resolve();
  }

  return createShopPromise.then(shop => {
    shopId = attrs.shopId || shop.id;
    return findCategoryPromise;
  }).then(category => {
    return createModel('Item', {
      name: attrs.name || faker.name.findName(),
      description: attrs.description || faker.lorem.sentence(),
      image: attrs.image || faker.image.imageUrl(),
      imageFile: attrs.imageFile,
      shopId: shopId,
      categoryId: attrs.categoryId || category.id,
      price: faker.random.number(),
      sort: faker.random.number(),
      status: attrs.status
    });
  });
};

var createOrder = (attrs) => {
  if (attrs == undefined) attrs = {};

  let createItemPromise, createUserPromise;
  let items, order;

  let Item = models.Item;
  let Order = models.Order; 
  let OrderLine = models.OrderLine;

  if (!attrs.items) {
    createItemPromise = createItem().then(item => {
      return Promise.resolve([item]);
    });
  } else {
    let itemIds = _.map(attrs.items, item => item.id);
    createItemPromise = Item.findAll({
      where: {
        id: {
          $in: itemIds
        }
      }
    });
  }

  if (!attrs.userId) {
    createUserPromise = createUser();
  } else {
    createUserPromise = Promise.resolve();
  }

  return createItemPromise.then(i => {
    items = i;
    return createUserPromise;
  }).then(u => {
    return Order.create({
      userId: attrs.userId || u.id,
      shopId: items[0].shopId,
      note: attrs.note || faker.lorem.sentence(),
      shipAddress: attrs.shipAddress || faker.address.streetAddress(),
      status: attrs.status
    });
  }).then(o => {
    order = o;
    let orderLineData = _.map(items, i => {
      let orderLine = getQuantityAndNoteOfItems(attrs.items, i.id);
      orderLine.item = _.pick(i, ['name', 'description', 'price']);
      orderLine.orderId = order.id;
      return orderLine;
    });
    return OrderLine.bulkCreate(orderLineData);
  }).then(() => {
    return Promise.resolve(order);
  });
};

var getQuantityAndNoteOfItems = (items, id) => {
  if (!items) {
    return {
      quantity: faker.random.number(),
      note: faker.lorem.sentence()
    };
  } else {
    let reqItem = _.filter(items, ['id', id])[0];
    delete reqItem.id;
    return reqItem;
  }
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
  createShipPlace: createShipPlace,
  createShopOpeningRequest: createShopOpeningRequest,
  createItem: createItem,
  createOrder: createOrder
};

// Setup some global helper
global.expect = expect;
