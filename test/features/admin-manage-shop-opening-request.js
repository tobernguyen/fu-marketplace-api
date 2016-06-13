'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const ShopOpeningRequest = require('../../models').ShopOpeningRequest;
const _ = require('lodash');

describe('GET /api/v1/admin/shopOpeningRequests', () => {
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
          expect(res.body.shopOpeningRequests).to.be.ok;
          let requests = res.body.shopOpeningRequests;
          expect(res.body.shopOpeningRequests).to.have.lengthOf(1);

          expect(requests[0]).to.have.all.keys(['id', 'name', 'description', 'note', 'ownerId', 'address', 'status', 'seller']);
          expect(requests[0].id).to.equal(pendingRequest.id);
          expect(requests[0].name).to.equal(pendingRequest.name);

          let seller = requests[0].seller;
          expect(seller).to.have.all.keys(['id', 'fullName', 'phone', 'identityNumber', 'identityPhoto', 'email', 'avatar']);
        })
        .expect(200, done);
    });

    describe('and with param showAll=true', () => {
      it('should return 200 with all shop opening requests', done => {
        request(app)
          .get('/api/v1/admin/shopOpeningRequests?showAll=true')
          .set('X-Access-Token', adminToken)
          .expect(res => {
            let requests = res.body.shopOpeningRequests;
            expect(requests).to.have.lengthOf(3);

            let requestNames = _.map(requests, r => r.name);
            expect(requestNames).to.have.members([pendingRequest.name, acceptedRequest.name, rejectedRequest.name]);
          })
          .expect(200, done);
      });
    });
  });
});
