'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const Category = require('../../models').Category;
const Item = require('../../models').Item;

describe('GET /api/v1/seller/shops/:shopId/items', () => {
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
      }); //we already have default category when doing migration
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

describe.only('POST /api/v1/seller/shops/:shopId/items', () => {
  let  shop, sellerToken, category;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      sellerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
    }).then(s => {
      shop = s;
      return Category.findOne({
        where: {
          name: 'Bánh mỳ'
        }
      }); //we already have default category when doing migration
    }).then(c => {
      category = c;
      done();
    });
  });

  describe('with valid item attribute via multipart form', () => {
    it('should return 200 with new item information', done => {
      request(app)
        .post(`/api/v1/seller/shops/${shop.id}/items`)
        .set('X-Access-Token', sellerToken)
        .field('name', 'TRÀ THÁI XANH MIX THẠCH - KHÔNG THẠCH')
        .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
        .field('quantity', 300)
        .field('price', 15000)
        .field('status', Item.STATUS.FOR_SELL)
        .field('sort', 0)
        .field('categoryId', category.id)
        .attach('imageFile', 'test/fixtures/user-avatar.jpg')
        .expect(res => {
          let body = res.body;
          expect(body.id).to.be.instanceOf(Number);
          expect(body.name).to.equal('TRÀ THÁI XANH MIX THẠCH - KHÔNG THẠCH');
          expect(body.describe).to.equal('Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ');
          expect(body.quantity).to.equal(300);
          expect(body.price).to.equal(15000);
          expect(body.status).to.equal(Item.STATUS.FOR_SELL);
          expect(body.sort).to.equal(0);
          expect(body.categoryId).to.equal(category.id);
          expect(body.image).to.have.string(`/shops/${shop.id}/items/${body.id}-small.jpg`);
        })
        .expect(200, done);
    });
  });

  describe('with some invalid fields in multipart form data', () => {
    it.skip('should return 400 with message about invalid fields', done => {

    });
  });

  describe('with invalid image file', () => {
    it.skip('should return 400 with message about invalid image', done => {

    });
  });
});
