'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const ShopOpeningRequest = require('../../models').ShopOpeningRequest;
const User = require('../../models').User;
const _ = require('lodash');

describe('POST /api/v1/requestOpenShopFirstTime', () => {
  let user, seller, sellerAccessToken, userAccessToken;
  
  before(done => {
    helper.factory.createUser().then(u => {
      user = u;
      userAccessToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUserWithRole({},'seller');
    }).then(u => {
      seller = u;
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
          expect(_.get(errors, ['sellerInfo.phone', 'message_code'])).to.equal('error.form_validation.must_be_a_number');
          expect(_.get(errors, ['sellerInfo.identityNumber', 'message_code'])).to.equal('error.form_validation.must_be_9_or_12_characters');
          expect(_.get(errors, ['shopInfo.name', 'message_code'])).to.equal('error.form_validation.must_not_be_empty');
          expect(_.get(errors, ['shopInfo.description', 'message_code'])).to.equal('error.form_validation.must_not_be_empty');
          expect(_.get(errors, ['shopInfo.address'])).to.be.undefined;
        })
        .expect(400, done);  
    });
  });

  describe('with valid request body but user did not upload identity photo', () => {
    it('should return 400 and response that identity photo is missing', done => {
      request(app)
        .post('/api/v1/requestOpenShopFirstTime')
        .set('X-Access-Token', userAccessToken)
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
          let errors = res.body.errors;
          expect(_.get(errors, ['sellerInfo.identityPhoto', 'message'])).to.equal('Identity photo must be present');
          expect(_.get(errors, ['sellerInfo.identityPhoto', 'message_code'])).to.equal('error.form_validation.identity_photo_must_be_present');
        })
        .expect(400, done);  
    });
  });

  describe('with valid request body', () => {
    before(done => {
      // Fake that user and seller had uploaded identity photo
      user.update({
        identityPhotoFile: {
          versions: [
            {
              Url: `http://localhost:3000/uploads/users/${user.id}/identityPhoto.jpg`,
              Key: `public/uploads/users/${user.id}/identityPhoto.jpg`
            }
          ]
        }
      }).then(u => {
        user = u;
        return seller.update({
          identityPhotoFile: {
            versions: [
              {
                Url: `http://localhost:3000/uploads/users/${seller.id}/identityPhoto.jpg`,
                Key: `public/uploads/users/${seller.id}/identityPhoto.jpg`
              }
            ]
          }
        }).then(s => {
          seller = s;
          done();
        });
      });
    });

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
        let openingShopRequest;

        before(done => {
          ShopOpeningRequest.create({
            name: 'An exist shop opening request',
            description: 'with fully description',
            address: 'C203',
            ownerId: user.id
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
            .post('/api/v1/requestOpenShopFirstTime')
            .set('X-Access-Token', userAccessToken)
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
              expect(res.body.message).to.equal('A pending request is existed');
              expect(res.body.message_code).to.equal('error.open_shop_request.a_pending_request_is_existed');
            })
            .expect(400, done);  
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
            .expect(200, done);
        });
      });
    });
  });
});

// Although below test cases is belongs to update user profile 
// but the mainly use of it is for request open new shop
// that why this test case place in this file
describe('POST /api/v1/me/uploadIdentityPhoto', () => {
  let user, sellerAccessToken, userAccessToken;
  
  before(done => {
    helper.factory.createUser().then(u => {
      user = u;
      userAccessToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      sellerAccessToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with user access token and', () => {
    describe('valid image file', () => {
      it('should return 200 with identity photo file info', done => {
        request(app)
          .post('/api/v1/users/me/uploadIdentityPhoto')
          .set('X-Access-Token', userAccessToken)
          .attach('file', 'test/fixtures/user-avatar.jpg')
          .expect(res => {
            expect(res.body.identityPhoto).to.have.string(`users/${user.id}/identity`);
          })
          .expect(200, done);  
      });
    });

    describe('invalid image file', () => {
      it('should return 422 and inform client file is invalid', done => {
        request(app)
          .post('/api/v1/users/me/uploadIdentityPhoto')
          .set('X-Access-Token', userAccessToken)
          .attach('file', 'test/fixtures/invalid-image.txt')
          .expect(res => {
            expect(res.body.status).to.equal(422);
            expect(res.body.message).to.equal('Only PNG and JPEG file is allowed');
          })
          .expect(422, done);
      });
    });
    
    describe('image file is too big', () => {
      let originalMaximumIdentitySize;
      
      before(() => {
        originalMaximumIdentitySize = User.MAXIMUM_IDENTITY_PHOTO_SIZE;
        User.MAXIMUM_IDENTITY_PHOTO_SIZE = 1024; // Allow 1KB file only
      });
      
      after(() => {
        User.MAXIMUM_IDENTITY_PHOTO_SIZE = originalMaximumIdentitySize;
      });
      
      it('should return 406 and inform client file is too big', done => {
        request(app)
          .post('/api/v1/users/me/uploadIdentityPhoto')
          .set('X-Access-Token', userAccessToken)
          .attach('file', 'test/fixtures/user-avatar.jpg')
          .expect(res => {
            expect(res.body.status).to.equal(406);
            expect(res.body.message).to.equal('File is too big. Maximum file size allow: 1KB');
          })
          .expect(406, done);
      });
    }); 
  });

  describe('with seller access token', () => {
    it('should return 403 with message "Seller is not allowed to change identity photo"', done => {
      request(app)
        .post('/api/v1/users/me/uploadIdentityPhoto')
        .set('X-Access-Token', sellerAccessToken)
        .attach('file', 'test/fixtures/user-avatar.jpg')
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message).to.equal('Seller is not allowed to change identity photo');
          expect(res.body.message_code).to.equal('errors.seller.change_identity_photo_not_allowed');
        })
        .expect(403, done);
    });
  });
});
