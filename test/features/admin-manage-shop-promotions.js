'use strict';

const helper = require('../helper');
const request = require('supertest-as-promised');
const app = require('../../app.js');

describe('GET /api/v1/admin/shopPromotionCampaigns', () => {
  let  adminToken;

  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with valid access token', () => {
    it.skip('should return 200 OK with all campaigns', done => {
      request(app)
        .get('/api/v1/admin/shopPromotionCampaigns')
        .set('X-Access-Token', adminToken)
        .expect(200)
        .then(res => {
          done();
        }).catch(done);
    });
    
    it.skip('should support pagination', done => {});
  });
});

describe('POST /api/v1/admin/shopPromotionCampaigns', () => {
  let  adminToken;

  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with valid campaign data', () => {
    it.skip('should return 200 and create new campaign', done => {
      request(app)
        .post('/api/v1/admin/shopPromotionCampaigns')
        .set('X-Access-Token', adminToken)
        .send({})
        .expect(200)
        .then(res => {
          done();
        }).catch(done);
    });
  });
});

describe('PUT /api/v1/admin/shopPromotionCampaigns/:id', () => {
  let  adminToken;

  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with valid campaign data', () => {
    it.skip('should return 200 and update the campaign', done => {
      request(app)
        .put('/api/v1/admin/shopPromotionCampaigns/1')
        .set('X-Access-Token', adminToken)
        .send({})
        .expect(200)
        .then(res => {
          done();
        }).catch(done);
    });
  });
});
