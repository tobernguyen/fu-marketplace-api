'use strict';

const helper = require('../helper');
const Category = require('../../models').Category;
const Item = require('../../models').Item;
const rewire = require('rewire');

describe('Item Model', () => {
  describe('factory', () => {
    it('should be valid', done => {
      let createdItem, shop;
      helper.factory.createUserWithRole({}, 'seller').then(u => {
        return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
      }).then(s => {
        shop = s;
        return Category.findOne({
          where: {
            name: 'Bánh mỳ'
          }
        }); //we already have default category when doing migrate
      }).then(c => {
        return helper.factory.createItem({
          shopId: shop.id,
          categoryId: c.id
        });
      }).then(item => {
        createdItem = item;
        expect(item).to.be.ok;
        return Item.findById(item.id);
      }).then(itemFromDb => {
        expect(createdItem.name).to.equal(itemFromDb.name);
        expect(createdItem.price).to.equal(itemFromDb.price);
        done();
      }, done);
    });
  });
  
  describe('#toJSON', () => {
    it('should omit IGNORE_ATTRIBUTES in result', done => {
      let IGNORE_ATTRIBUTES = rewire('../../models/item').__get__('IGNORE_ATTRIBUTES');
      
      Item.findOne().then(item => {
        let actualJSON = item.toJSON();
        IGNORE_ATTRIBUTES.forEach(attribute => {
          expect(actualJSON[attribute]).to.be.undefined;
        });
        done();
      });
    });
  });
});
