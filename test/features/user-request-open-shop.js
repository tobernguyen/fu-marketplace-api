'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const _ = require('lodash');

describe('POST /api/v1/requestOpenShopFirstTime', () => {
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

  describe('with invalid request body', () => {
    it('should return 400 with details of invalid params', done => {
      request(app)
        .post('/api/v1/requestOpenShopFirstTime')
        .set('X-Access-Token', userAccessToken)
        .set('Content-Type', 'application/json')
        .send({
          sellerInfo: {
          },
          shopInfo: {
            address: 'C203'
          },
          note: 'Em muon thanh ti phu'
        })
        .expect(res => {
          expect(res.body.status).to.equal(400);
          let errors = res.body.errors;
          expect(_.get(errors, 'sellerInfo.phone').message_code).to.equal('error.form_validation.must_be_a_number');
          expect(_.get(errors, 'sellerInfo.identityNumber').message_code).to.equal('error.form_validation.must_be_9_or_12_characters');
          expect(_.get(errors, 'shopInfo.name').message_code).to.equal('error.form_validation.must_not_be_empty');
          expect(_.get(errors, 'shopInfo.description').message_code).to.equal('error.form_validation.must_not_be_empty');
          expect(_.get(errors, 'shopInfo.address')).to.be.undefined;
        })
        .expect(400, done);  
    });
  });

  describe('with valid request body', () => {
    describe('with seller access token', () => {
      it('should return 400 Already seller', done => {
        request(app)
          .post('/api/v1/requestOpenShopFirstTime')
          .set('X-Access-Token', sellerAccessToken)
          .set('Content-Type', 'application/json')
          .send({
            sellerInfo: {
              phone: '23123123123',
              identityNumber: '163299755'
            },
            shopInfo: {
              name: 'Banh My',
              description: 'banh my XXX',
              address: 'C203'
            },
            note: 'Em muon thanh ti phu'
          })
          .expect(res => {
            expect(res.body.status).to.equal(400);
            expect(res.body.message_code).to.equal('error.open_shop_request.already_seller');
          })
          .expect(400, done);  
      });
    });

    describe('with user access token', () => {
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
              let errors = res.body.errors;
              expect(_.get(errors, 'sellerInfo.phone').message_code).to.equal('error.form_validation.must_be_a_number');
              expect(_.get(errors, 'sellerInfo.identityNumber').message_code).to.equal('error.form_validation.must_be_9_or_12_characters');
              expect(_.get(errors, 'shopInfo.name').message_code).to.equal('error.form_validation.must_not_be_empty');
              expect(_.get(errors, 'shopInfo.description').message_code).to.equal('error.form_validation.must_not_be_empty');
              expect(_.get(errors, 'shopInfo.address').message_code).to.equal('error.form_validation.must_not_be_empty');
            })
            .expect(400, done);  
        });
      });

      describe('with valid user and valid shop information', () => {
        it('should return 200 OK and return opening request detail', done => {
          request(app)
            .post('/api/v1/requestOpenShopFirstTime')
            .set('X-Access-Token', userAccessToken)
            .send({
              sellerInfo: {
                phone: '123123123123',
                identityNumber: '163299755'
              },
              shopInfo: {
                name: 'Banh My',
                description: 'banh my XXX',
                address: 'C203'
              },
              note: 'Em muon thanh ti phu'
            })
            .set('Content-Type', 'application/json')
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
