'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');


describe('GET /api/v1/admin/shops/:id', () => {
  let  adminToken, shop;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUser();
    }).then(u => {
      return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
    }).then(s => {
      shop = s;
      done();
    });
  });
  
  describe('with exits shop', () => {
    it('should return 200 OK and return new user profile', done => {
      request(app)
        .get(`/api/v1/admin/shops/${shop.id}`)
        .set('X-Access-Token', adminToken)
        .expect(res => {
          expect(res.body.name).to.equal(shop.name);
          expect(res.body.id).to.equal(shop.id);
          expect(res.body.ownerId).to.equal(shop.ownerId);
          expect(res.body.description).to.equal(shop.description);
          expect(res.body.avatar).to.equal(shop.avatar);
          expect(res.body.cover).to.equal(shop.cover);
          expect(res.body.shipPlaces.filter(function(e) {
            return e.name == 'dom A';
          }).length).to.equal(1);
        })
        .expect(200, done);  
    });
  });
  
  describe('with non-exits shop', () => {
    it('should return 404 error', done => {
      request(app)
        .get('/api/v1/admin/shops/0')
        .set('X-Access-Token', adminToken)
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.error).to.equal('Shop is not exits');
          expect(res.body.message_code).to.equal('error.model.shop_is_not_exits');
        })
        .expect(404, done);  
    });
  });
});

describe('GET /api/v1/admin/shops/', () => {
  let adminToken, normalUserAccessToken;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUser();
    }).then(u => {
      normalUserAccessToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
    }).then(s => {
      done();
    });
  });
  
  describe('with admin access token', () => {
    it('should return 200 OK and return an array contain shop info', done => {
      request(app)
        .get('/api/v1/admin/shops/')
        .set('X-Access-Token', adminToken)
        .expect(res => {
          expect(res.body.shops).to.be.ok;
        })
        .expect(200, done);  
    });
  });
  
  describe('with normal user access token', () => {
    it('should return 403 Forbidden', done => {
      request(app)
        .get('/api/v1/admin/shops/')
        .set('X-Access-Token', normalUserAccessToken)
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.authentication.not_authorized');
        })
        .expect(403, done);  
    });
  });
});