'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');

describe('GET /api/v1/shops/:shopId', () => {
  let shop, accessToken;
  
  before(done => {
    helper.factory.createUser().then(u => {
      accessToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({}, 'Dom A');
    }).then(s => {
      shop = s;
      return helper.factory.createItem({ shopId: s.id});
    }).then(() => {
      done();
    });
  });
  
  describe('with valid access token and existing shop ', () => {
    it('should return 200 OK with shop detail', done => {
      request(app)
        .get(`/api/v1/shops/${shop.id}`)
        .set('X-Access-Token', accessToken)
        .expect(res => {
          expect(res.body.name).to.equal(shop.name);
          expect(res.body.id).to.equal(shop.id);
          expect(res.body.ownerId).to.equal(shop.ownerId);
          expect(res.body.description).to.equal(shop.description);
          expect(res.body.avatar).to.equal(shop.avatar);
          expect(res.body.cover).to.equal(shop.cover);
          expect(res.body.shipPlaces.length).to.equal(1);
          expect(res.body.items.length).to.equal(1);
          expect(res.body.seller.id).to.equal(shop.ownerId);
        })
        .expect(200, done);  
    });
  });

  describe('with valid access token and not existing shop ', () => {
    it('should return 404 shop not found', done => {
      request(app)
        .get('/api/v1/shops/0')
        .set('X-Access-Token', accessToken)
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.message_code).to.equal('error.model.shop_does_not_exist');
        })
        .expect(404, done);  
    });
  });

  describe('with valid access token and banned shop ', () => {
    let bannedShop;

    beforeEach(done => {
      helper.factory.createShopWithShipPlace({banned: true}, 'Dom A').then(s => {
        bannedShop = s;
        done();
      });
    });

    it('should return 404 shop not found', done => {
      request(app)
        .get(`/api/v1/shops/${bannedShop.id}`)
        .set('X-Access-Token', accessToken)
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.message_code).to.equal('error.model.shop_does_not_exist');
        })
        .expect(404, done);  
    });
  });

});
