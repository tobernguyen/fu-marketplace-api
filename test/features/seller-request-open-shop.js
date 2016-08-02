/**
 * Created by @SonHT on 7/5/16.
 */

'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const ShopOpeningRequest = require('../../models').ShopOpeningRequest;
var _ = require('lodash');

describe('POST /api/v1/seller/shopOpeningRequest', () => {
  let  sellerToken, seller, userToken;
    
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      sellerToken = helper.createAccessTokenForUserId(u.id);
      return u.update({
        identityPhotoFile: {
          versions: [
            {
              Url: `http://localhost:3000/uploads/users/${u.id}/identityPhoto.jpg`,
              Key: `public/uploads/users/${u.id}/identityPhoto.jpg`
            }
          ]
        }
      });
    }).then((u) => {
      seller = u;
      return helper.factory.createUser();
    }).then(u => {
      userToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with seller access token', () => {
    describe('with invalid request body', () => {
      it('should return 400 with details of invalid params', done => {
        request(app)
          .post('/api/v1/seller/shopOpeningRequest')
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            shopInfo: {
              address: 'C203'
            },
            note: 'Em muon thanh ti phu'
          })
          .expect(res => {
            expect(res.body.status).to.equal(400);
            let errors = res.body.errors;
            expect(_.get(errors, ['shopInfo.name', 'message_code'])).to.equal('error.form_validation.must_not_be_empty');
            expect(_.get(errors, ['shopInfo.description', 'message_code'])).to.equal('error.form_validation.must_not_be_empty');
            expect(_.get(errors, ['shopInfo.address'])).to.be.undefined;
          })
          .expect(400, done);
      });
    });

    describe('with valid request body', () => {
      it('should return 200 OK and return opening request detail', done => {
        request(app)
          .post('/api/v1/seller/shopOpeningRequest')
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            shopInfo: {
              name: 'Banh My',
              description: 'banh my XXX',
              address: 'C203',
              phone: '0123456789'
            },
            note: 'Em muon thanh ti phu'
          })
          .expect(res => {
            let sellerInfo = res.body.sellerInfo;
            let shopInfo = res.body.shopInfo;
            expect(sellerInfo.identityNumber).to.equal(seller.identityNumber);
            expect(sellerInfo.identityPhoto).to.have.string(`users/${seller.id}/identity`);
            expect(shopInfo.name).to.equal('Banh My');
            expect(shopInfo.description).to.equal('banh my XXX');
            expect(shopInfo.address).to.equal('C203');
            expect(shopInfo.phone).to.equal('0123456789');
            expect(res.body.note).to.equal('Em muon thanh ti phu');
          })
          .expect(200, done);
      });
    });

    describe('with a seller who already had a pending request', () => {
      let openingShopRequest;

      before(done => {
        ShopOpeningRequest.create({
          name: 'An exist shop opening request',
          description: 'with fully description',
          address: 'C203',
          ownerId: seller.id,
          phone: '0123456789'
        }).then(obj => {
          openingShopRequest = obj;
          done();
        });
      });

      after(done => {
        openingShopRequest.destroy().then(() => done());
      });

      it('should return 400 with message "A pending request is existed"', done => {
        request(app)
          .post('/api/v1/seller/shopOpeningRequest')
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            shopInfo: {
              name: 'Banh My',
              description: 'banh my XXX',
              address: 'C203',
              phone: '01234567890'
            },
            note: 'Em muon thanh ti phu'
          })
          .expect(res => {
            expect(res.body.status).to.equal(400);
            expect(res.body.message).to.equal('A pending request is existed');
            expect(res.body.message_code).to.equal('error.open_shop_request.a_pending_request_is_existed');
          })
          .expect(400, done);
      });
    });
  });

  describe('with user access token', () => {
    it('should return 403', done => {
      request(app)
        .post('/api/v1/seller/shopOpeningRequest')
        .set('X-Access-Token', userToken)
        .set('Content-Type', 'application/json')
        .send({
          shopInfo: {
            name: 'Banh My',
            description: 'banh my XXX',
            address: 'C203'
          },
          note: 'Em muon thanh ti phu'
        })
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.authentication.not_authorized');
        })
        .expect(403, done);
    });
  });
});


