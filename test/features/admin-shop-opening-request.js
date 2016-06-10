'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const ShopOpeningRequest = require('../../models').ShopOpeningRequest;

describe.only('GET /api/v1/admin/shopOpeningRequests', () => {
  let pendingRequest, acceptedRequest, rejectedRequest, adminToken;
  
  before(done => {
    helper.factory.createUserWithRole({},'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopOpeningRequest();
    }).then(o => {
      pendingRequest = o;
      return helper.factory.createShopOpeningRequest({status: ShopOpeningRequest.STATUS.ACCEPTED});
    }).then(o => {
      acceptedRequest = o;
      return helper.factory.createShopOpeningRequest({status: ShopOpeningRequest.STATUS.REJECTED});
    }).then(o => {
      rejectedRequest = o;
      done();
    });
  });

  describe('with admin access token', () => {
    it('should return 200 with all pending shop opening requests', done => {
      request(app)
        .get('/api/v1/admin/shopOpeningRequests')
        .set('X-Access-Token', adminToken)
        .expect(res => {
          console.log(res.body);
          console.log(res.body.shops[0].seller);
          expect(res.body.shops).to.be.ok;
          let shops = res.body.shops;
          expect(shops.length).to.equal(1);
          expect(shops[0].id).to.equal(pendingRequest.id);
          expect(shops[0].name).to.equal(pendingRequest.name);
        })
        .expect(200, done);
    });

    describe('and with param showAll=true', () => {
      it.skip('should return 200 with all shop opening requests', done => {

      });
    });
  });
});
