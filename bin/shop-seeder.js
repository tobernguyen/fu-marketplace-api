'use strict';

var dotenv = require('dotenv');
dotenv.load({ path: `.env.${process.env.NODE_ENV || 'development'}` });

var faker = require('faker');
faker.locale = 'vi';

var models = require('../models');
var _ = require('lodash');
var prompt = require('prompt');
var schema = {
  properties: {
    noOfShop: {
      description: 'Number of shop to create',
      type: 'number',
      required: true,
      default: '25'
    },
    minItem: {
      description: 'Minimum item per shop',
      type: 'number',
      required: true,
      default: '5'
    },
    maxItem: {
      description: 'Maximum item per shop',
      type: 'number',
      required: true,
      default: '20'
    }
  }
};

prompt.start();
prompt.get(schema, (err, data) => {
  seedShop(data);
});

var seedShop = (data) => {
  let allCategories, allShipPlaces;
  
  models.Category.findAll({}).then(cats => {
    allCategories = cats;

    return models.ShipPlace.findAll({});
  }).then(sp => {
    allShipPlaces = sp;

    let promises = [];
    _.times(data.noOfShop, i => {
      let currentShop;

      // Create seller
      promises[promises.length] = createUserWithRole({}, 'seller').then(u => {
        // Create shop
        return models.Shop.create({
          name: faker.name.findName() + ' ' + faker.lorem.words(),
          description: faker.lorem.paragraph(_.random(1,3)),
          avatar: 'http://lorempixel.com/250/250/food/',
          cover: 'http://lorempixel.com/850/250/food/',
          ownerId: u.id,
          opening: _.sample([true, false]),
          banned: _.sample([true, false]),
          status: _.sample(models.Shop.STATUS)
        });
      }).then(shop => {
        currentShop = shop;
        // Add random ship place(s)
        return shop.setShipPlaces(_.sampleSize(allShipPlaces, _.random(1, allShipPlaces.length)));
      }).then(() => {
        let promises = [];
        // Add items to shops
        _.times(_.random(data.minItem, data.maxItem), i => {
          promises[promises.length] = models.Item.create({
            name: faker.lorem.words(),
            description: faker.lorem.words(),
            image: 'http://lorempixel.com/250/250/food/',
            price: faker.random.number(),
            shopId: currentShop.id,
            categoryId: _.sample(allCategories).id,
            sort: i,
            status: _.sample(models.Item.STATUS)
          });
        });

        return Promise.all(promises);
      });
    });

    return Promise.all(promises);
  }).then(() => {
    models.sequelize.close();
    console.log('Done');
  }, err => {
    models.sequelize.close();
    console.error(err);
  });
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

const assignRoleToUser = (user, roleName) => {  
  let Role = models.Role;
  return Role.findOrCreate({where: {name: roleName}}).then(role => {
    return user.addRole(role[0]);
  }).then(() => Promise.resolve(user));
};

var createUser = (attrs) => {
  if (attrs == undefined) attrs = {};

  let password = attrs.password || faker.internet.password();
  
  return createModel('User', {
    fullName: attrs.fullname || faker.name.findName(),
    email: attrs.email || (() => {
      faker.locale = 'en';
      let email = faker.lorem.word() + faker.internet.email();
      faker.locale = 'vi';
      return email;
    })(),
    password: password,
    phone: attrs.phone,
    avatar: 'http://lorempixel.com/100/100/',
    avatarFile: attrs.avatarFile,
    identityNumber: attrs.identityNumber,
    identityPhotoFile: attrs.identityPhotoFile
  }).then(u => {
    u['__test__'] = {password: password}; // inject testing data into user object
    return Promise.resolve(u);
  });
};

const createModel = (modelName, attrs) => {
  if (attrs == undefined) attrs = {};
  let Model = models[modelName];
  return Model.create(attrs);
};
