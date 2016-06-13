'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const ShopOpeningRequest = require('../../models').ShopOpeningRequest;

describe('GET /api/v1/users/me/shopOpeningRequests', () => {
  let user, accessToken, pendingRequest;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      user = u;
      accessToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopOpeningRequest({ownerId: u.id});
    }).then(sor => {
      pendingRequest = sor;
      return helper.factory.createShopOpeningRequest({ownerId: user.id, status: ShopOpeningRequest.STATUS.ACCEPTED});
    }).then(() => {
      done();
    });
  });
  
  describe('with valid access token and ', () => {
    it('should return 200 OK with all pending shop requests of current users', done => {
      request(app)
        .get('/api/v1/users/me/shopOpeningRequests')
        .set('X-Access-Token', accessToken)
        .expect(res => {
          expect(res.body.shopOpeningRequests).to.be.instanceof(Array);

          let shopOpeningRequests = res.body.shopOpeningRequests;

          expect(shopOpeningRequests).to.have.lengthOf(1);
          expect(shopOpeningRequests[0].name).to.equal(pendingRequest.name);
          expect(shopOpeningRequests[0].id).to.equal(pendingRequest.id);
        })
        .expect(200, done);  
    });
  });
});
