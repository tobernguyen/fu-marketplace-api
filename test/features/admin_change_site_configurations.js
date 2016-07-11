'use strict';

const helper = require('../helper');
const request = require('supertest-as-promised');
const app = require('../../app.js');

describe('GET /api/v1/admin/shopRequestMailingList', () => {
  let  adminToken;

  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with valid access token', () => {
    it('should return 200 OK with shop reviewer email list', done => {
      request(app)
        .get('/api/v1/admin/shopRequestMailingList')
        .set('X-Access-Token', adminToken)
        .expect(200)
        .then(res => {
          let body = res.body;
          // Expect to have one element because we added it on migration
          expect(body.shopRequestMailingList).to.be.an('array');
          expect(body.shopRequestMailingList).to.have.lengthOf(1);
          expect(body.shopRequestMailingList[0]).to.equal('longnh1994@gmail.com');
          done();
        }).catch(done);
    });
  });
});

describe('POST /api/v1/admin/shopRequestMailingList', () => {
  let  adminToken;

  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with an array of valid email addresses', () => {
    it('should return 200 OK with updated value', done => {
      request(app)
        .post('/api/v1/admin/shopRequestMailingList')
        .set('X-Access-Token', adminToken)
        .send({
          shopRequestMailingList: ['longnhse03005@fpt.edu.vn']
        })
        .expect(200)
        .then(res => {
          let body = res.body;
          expect(body.shopRequestMailingList).to.be.an('array');
          expect(body.shopRequestMailingList).to.have.lengthOf(1);
          expect(body.shopRequestMailingList[0]).to.equal('longnhse03005@fpt.edu.vn');
          done();
        }).catch(done);
    });
  });

  describe('with an array contain invalid email address', () => {
    it('should return 400', done => {
      request(app)
        .post('/api/v1/admin/shopRequestMailingList')
        .set('X-Access-Token', adminToken)
        .send({
          shopRequestMailingList: ['longnhse03005@fpt.edu.vn', 'longnguyen']
        })
        .expect(400)
        .then(res => {
          let body = res.body;
          expect(body.message).to.equal('Invalid email address');
          done();
        }).catch(done);
    });
  });

  describe('without valid data', () => {
    it('should return 400', done => {
      request(app)
        .post('/api/v1/admin/shopRequestMailingList')
        .set('X-Access-Token', adminToken)
        .expect(400)
        .then(res => {
          let body = res.body;
          expect(body.message).to.equal('Invalid request');
          done();
        }).catch(done);
    });
  });
});
