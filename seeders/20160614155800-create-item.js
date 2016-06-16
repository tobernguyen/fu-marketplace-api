'use strict';

const models = require('../models');

module.exports = {
  up: function (queryInterface, Sequelize) {
    var category, shop;
    
    return models.Shop.findOne({
      where: {
        name: 'Bánh mì dân tổ'
      }
    }).then(function(s) {
      shop = s;
      return models.Category.findOne({
        where: {
          name: 'Bánh mỳ'
        }
      });
    }).then(function(c) {
      category = c;
      return models.Item.create({
        name: 'Bánh mỳ JAV',
        price: 30,
        sort: 1,
        description: 'Bánh mỳ JAV',
        quantity: 10,
        categoryId: category.id,
        shopId: shop.id
      });
    }).then(() => {
      return models.Item.create({
        name: 'Bánh mỳ KIMOCHI',
        price: 25,
        sort: 2,
        description: 'Bánh mỳ KIMOCHI',
        quantity: 30,
        categoryId: category.id,
        shopId: shop.id
      });
    }).then(() => {
      return models.Item.create({
        name: 'Bánh mỳ DÂN TỔ',
        price: 20,
        sort: 3,
        description: 'Bánh mỳ DÂN TỔ',
        categoryId: category.id,
        shopId: shop.id
      });
    }).then(() => {
      return models.Item.create({
        name: 'Bánh mỳ Ngải cứu chả',
        price: 20,
        sort: 4,
        description: 'Bánh mỳ Ngải cứu chả',
        quantity: 100,
        categoryId: category.id,
        shopId: shop.id
      });
    }).then(() => {
      return models.Item.create({
        name: 'Bánh mỳ chả',
        price: 15,
        sort: 6,
        description: 'Bánh mỳ chả',
        quantity: 100,
        categoryId: category.id,
        shopId: shop.id
      });
    }).then(() => {
      return models.Item.create({
        name: 'Bánh mỳ HotDog',
        price: 15,
        sort: 6,
        description: 'Bánh mỳ HotDog',
        quantity: 100,
        categoryId: category.id,
        shopId: shop.id
      });
    }).then(() => {
      return models.Item.create({
        name: 'Bánh mỳ Pate Trứng',
        price: 15,
        sort: 6,
        description: 'Bánh mỳ Pate Trứng',
        quantity: 100,
        categoryId: category.id,
        shopId: shop.id
      });
    }).then(() => {
      return models.Item.create({
        name: 'Bánh mỳ Trứng lá ngải',
        price: 15,
        sort: 6,
        description: 'Bánh mỳ Trứng lá ngải',
        quantity: 100,
        categoryId: category.id,
        shopId: shop.id
      });
    }).then(() => {
      return models.Item.create({
        name: 'Lọc đá/Trà Đá',
        price: 3,
        sort: 6,
        description: 'Lọc đá/Trà đá kèm bánh mì',
        categoryId: category.id,
        shopId: shop.id
      });
    }).then(() => {
      return models.Item.create({
        name: 'Coca - Sprite - Fanta - Pepsi',
        price: 5,
        sort: 6,
        description: 'Coca - Sprite - Fanta - Pepsi kèm bánh mì',
        categoryId: category.id,
        shopId: shop.id
      });
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Items', {});
  }
};
