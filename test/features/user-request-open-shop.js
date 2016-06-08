'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');

describe.only('POST /api/v1/requestOpenShopFirstTime', () => {
  let user, sellerAccessToken, userAccessToken;
  
  before(done => {
    helper.factory.createUser().then(u => {
      user = u;
      userAccessToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUserWithRole({},'seller');
    }).then(u => {
      sellerAccessToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe.only('with invalid request body', () => {
    it('should return 400 with details of invalid params', done => {
      request(app)
        .post('/api/v1/requestOpenShopFirstTime')
        .set('X-Access-Token', userAccessToken)
        .set('Content-Type', 'application/json')
        .send({
          name: 'Banh my'
        })
        .expect(res => {
          expect(res.body.status).to.equal(400);
        })
        .expect(400, done);  
    });
  });

  describe('with valid request body', () => {
    describe('with seller access token', () => {
      it('should return 403 Forbidden', done => {
        request(app)
          .post('/api/v1/requestOpenShopFirstTime')
          .set('X-Access-Token', sellerAccessToken)
          .send({
            name: 'Banh my'
          })
          .set('Content-Type', 'application/json')
          .expect(res => {
            expect(res.body.status).to.equal(403);
            expect(res.body.message_code).to.equal('error.authentication.not_authorized');
          })
          .expect(403, done);  
      });
    });

    describe('with user access token', () => {
      describe('without seller info', () => {
        it('should return 400 need provide user identity', done => {
          request(app)
            .post('/api/v1/requestOpenShopFirstTime')
            .set('X-Access-Token', userAccessToken)
            .send({
              shopInfo: {
                
              } 
            })
            .set('Content-Type', 'application/json')
            .expect(res => {
              expect(res.body.status).to.equal(400);
            })
            .expect(400, done);  
        });
      });

      describe('without shop information', () => {
        it('should return 400 need provide shop information', done => {
          request(app)
            .post('/api/v1/requestOpenShopFirstTime')
            .set('X-Access-Token', userAccessToken)
            .send({
              sellerInfo: {
                
              } 
            })
            .set('Content-Type', 'application/json')
            .expect(res => {
              expect(res.body.status).to.equal(400);
            })
            .expect(400, done);  
        });
      });

      describe('with valid user and valid shop information', () => {

        it('should return 200 OK and return opening request detail', done => {
          request(app)
            .post('/api/v1/requestOpenShopFirstTime')
            .set('X-Access-Token', userAccessToken)
            .set('Content-Type', 'application/json')
            .send({
              sellerInfo: {
                phone: '0123123123123',
                identityNumber: '163299755'
              },
              shopInfo: {
                name: 'Banh My',
                description: 'banh my XXX',
                address: 'C203'
              },
              note: 'Em muon thanh ti phu'
            })
            .attach('file', 'test/fixtures/user-avatar.jpg')
            .expect(res => {
              let sellerInfo = res.body.sellerInfo;
              let shopInfo = res.body.shopInfo;
              expect(sellerInfo.phone).to.equal('0123123123123');
              expect(sellerInfo.identityNumber).to.equal('163299755');
              expect(sellerInfo.identityPhoto).to.have.string(`users/${user.id}/identity`);
              expect(shopInfo.name).to.equal('Banh My');
              expect(shopInfo.description).to.equal('banh my XXX');
              expect(shopInfo.address).to.equal('C203');
              expect(res.body.note).to.equal('Em muon thanh ti phu');
            })
            .expect(200, done);  
        });
      });
    });
  });
});
