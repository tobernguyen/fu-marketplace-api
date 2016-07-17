'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const ShopOpeningRequest = require('../../models').ShopOpeningRequest;
const Shop = require('../../models').Shop;
const User = require('../../models').User;
const _ = require('lodash');
const emailer = require('../../libs/emailer');

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

          expect(requests[0]).to.have.all.keys(['id', 'name', 'description', 'note', 'adminMessage', 'ownerId', 'phone', 'address', 'status', 'seller']);
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

describe('POST /api/v1/admin/shopOpeningRequests/:id/accept', () => {
  let pendingRequest, adminToken;
  
  before(done => {
    helper.factory.createUserWithRole({},'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopOpeningRequest();
    }).then(o => {
      pendingRequest = o;
      done();
    });
  });

  describe('with admin access token', () => {
    describe('with id of pending request and a note from admin', () => {
      it('should accept the shop opening request and return 200', done => {
        let checkAcceptShopOpeningRequestLogic = () => {
          pendingRequest.reload().then(r => {
            expect(r.status).to.equal(ShopOpeningRequest.STATUS.ACCEPTED);
            expect(r.adminMessage).to.equal('We hope you have a nice experience with FU Marketplace.');

            return Shop.findOne({
              order: '"createdAt" DESC'
            });
          }).then(latestShop => {
            // Check the transformation from ShopOpeningRequest to Shop
            let attributeToCompare = ['name', 'description', 'address', 'ownerId'];
            attributeToCompare.forEach(attr => {
              expect(latestShop.get(attr)).to.equal(pendingRequest.get(attr));
              expect(latestShop.banned).to.not.be.ok;
              expect(latestShop.status).to.equal(0); // UNPUBLISHED
            });
            
            return User.findById(pendingRequest.ownerId);
          }).then(u => {
            // Promote user to seller if he/she is not
            expect(u.verifyRole('seller')).to.eventually.equal(true);

            // Check for sending notification to user
            let jobs = helper.queue.testMode.jobs;
            expect(jobs).to.have.lengthOf(3);
            expect(jobs[1].type).to.equal('send shop opening request notification');
            expect(jobs[1].data).to.eql({shopOpeningRequestId: pendingRequest.id});

            // Check for sending email to user
            expect(jobs[2].type).to.equal('email');
            expect(jobs[2].data).to.eql({
              template: emailer.EMAIL_TEMPLATE.RESPONSE_SHOP_OPENING_REQUEST,
              data: { shopOpeningRequestId: pendingRequest.id }
            });

            done();
          });
        };

        helper.queue.testMode.clear();

        request(app)
          .post(`/api/v1/admin/shopOpeningRequests/${pendingRequest.id}/accept`)
          .set('X-Access-Token', adminToken)
          .send({
            message: 'We hope you have a nice experience with FU Marketplace.'
          })
          .expect(200, checkAcceptShopOpeningRequestLogic);
      });
    });

    describe('with invalid id', () => {
      it('should return 404', done => {
        request(app)
          .post('/api/v1/admin/shopOpeningRequests/12345/accept')
          .set('X-Access-Token', adminToken)
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.message_code).to.equal('error.models.shop_opening_request_not_found');
          })
          .expect(404, done);
      });
    });

    describe('with id does not belong to a pending request', () => {
      let acceptedRequest;

      before(done => {
        helper.factory.createShopOpeningRequest({status: ShopOpeningRequest.STATUS.ACCEPTED}).then(sor => {
          acceptedRequest = sor;
          done();
        });
      });

      it('should return 400', done => {
        request(app)
          .post(`/api/v1/admin/shopOpeningRequests/${acceptedRequest.id}/accept`)
          .set('X-Access-Token', adminToken)
          .expect(400, done);
      });
    });
  });
});

describe('POST /api/v1/admin/shopOpeningRequests/:id/reject', () => {
  let pendingRequest, adminToken;
  
  before(done => {
    helper.factory.createUserWithRole({},'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopOpeningRequest();
    }).then(o => {
      pendingRequest = o;
      done();
    });
  });

  describe('with admin access token', () => {
    describe('with id of pending request and a note from admin', () => {
      it('should reject the shop opening request and return 200', done => {
        let checkRejectShopOpeningRequestLogic = () => {
          pendingRequest.reload().then(r => {
            expect(r.status).to.equal(ShopOpeningRequest.STATUS.REJECTED);
            expect(r.adminMessage).to.equal('Please provide Identity Photo');

            // Check for sending notification to user
            let jobs = helper.queue.testMode.jobs;
            expect(jobs).to.have.lengthOf(2);
            expect(jobs[0].type).to.equal('send shop opening request notification');
            expect(jobs[0].data).to.eql({shopOpeningRequestId: pendingRequest.id});

            // Check for sending email to user
            expect(jobs[1].type).to.equal('email');
            expect(jobs[1].data).to.eql({
              template: emailer.EMAIL_TEMPLATE.RESPONSE_SHOP_OPENING_REQUEST,
              data: { shopOpeningRequestId: pendingRequest.id }
            });
            done();
          });
        };

        helper.queue.testMode.clear();

        request(app)
          .post(`/api/v1/admin/shopOpeningRequests/${pendingRequest.id}/reject`)
          .set('X-Access-Token', adminToken)
          .send({
            message: 'Please provide Identity Photo'
          })
          .expect(200, checkRejectShopOpeningRequestLogic);
      });
    });

    describe('with invalid id', () => {
      it('should return 404', done => {
        request(app)
          .post('/api/v1/admin/shopOpeningRequests/12345/reject')
          .set('X-Access-Token', adminToken)
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.message_code).to.equal('error.models.shop_opening_request_not_found');
          })
          .expect(404, done);
      });
    });

    describe('with id does not belong to a pending request', () => {
      let acceptedRequest;

      before(done => {
        helper.factory.createShopOpeningRequest({status: ShopOpeningRequest.STATUS.ACCEPTED}).then(sor => {
          acceptedRequest = sor;
          done();
        });
      });

      it('should return 400', done => {
        request(app)
          .post(`/api/v1/admin/shopOpeningRequests/${acceptedRequest.id}/reject`)
          .set('X-Access-Token', adminToken)
          .expect(400, done);
      });
    });
  });
});
