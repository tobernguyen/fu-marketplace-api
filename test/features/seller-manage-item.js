'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const Category = require('../../models').Category;

describe.only('GET /api/v1/seller/shops/:shopId/items', () => {
  let  seller, shop1, shop2, sellerToken, category, item;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      seller = u;
      sellerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
    }).then(s => {
      shop1 = s;
      return Category.findOne({
        where: {
          name: 'Bánh mỳ'
        }
      }); //we already have default category when doing migrate
    }).then(c => {
      category = c;
      return helper.factory.createItem({
        shopId: shop1.id,
        categoryId: c.id
      });
    }).then(i => {
      item = i;
      return helper.factory.createShopWithShipPlace({}, seller.id, 'dom A');
    }).then(s => {
      shop2 = s;
      done();
    });
  });
  
  describe('with shop have item', () => {
    it('should return 200 OK and return non-empty array contain info of items in shops', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop1.id}/items`)
        .set('X-Access-Token', sellerToken)
        .expect(res => {
          expect(res.body.items).to.have.lengthOf(1);
          let i = res.body.items[0];
          expect(i.description).to.equal(item.description);
          expect(i.id).to.equal(item.id);
          expect(i.image).to.equal(item.image);
          expect(i.price).to.equal(item.price);
          expect(i.name).to.equal(item.name);
          expect(i.shopId).to.equal(shop1.id);
          expect(i.categoryId).to.equal(category.id);
        })
        .expect(200, done); 
    });
  });
  
  describe('with do not have item', () => {
    it('should return 200 OK and return empty array contain info of items in shops', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop2.id}/items`)
        .set('X-Access-Token', sellerToken)
        .expect(res => {
          expect(res.body.items).to.have.lengthOf(0);
          expect(res.body.items).to.be.instanceOf(Array);
        })
        .expect(200, done); 
    });
  });
});