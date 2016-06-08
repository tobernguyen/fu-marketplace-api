'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');

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
          expect(errors['sellerInfo.phone'].message_code).to.equal('error.form_validation.must_be_a_number');
          expect(errors['sellerInfo.identityNumber'].message_code).to.equal('error.form_validation.must_be_9_or_12_characters');
          expect(errors['shopInfo.name'].message_code).to.equal('error.form_validation.must_not_be_empty');
          expect(errors['shopInfo.description'].message_code).to.equal('error.form_validation.must_not_be_empty');
          expect(errors['shopInfo.address']).to.be.undefined;
        })
        .expect(400, done);  
    });
  });

  describe('with valid request body but user did not upload identity photo', () => {
    it.skip('should return 400 and response that identity photo is missing', () => {
      // TODO: Viet test cho truong hop request bi reject 
      // vi user chua upload identity photo
    });
  });

  describe.skip('with valid request body', () => {
    // TODO: upload identity photo len o day thi moi duoc coi la valid request body

    describe('with seller access token', () => {
      it('should return 400 already seller', done => {
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
      describe('user having a pending request', () => {
        it('should return 400 with message "A pending request is existed"', () => {
          // TODO: Viet test cho truong hop request bi reject 
          // khi ma user dang co 1 request pending roi
        });
      });

      describe('user have no pending request', () => {
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
            .expect(200);
        });
      });
    });
  });
});
