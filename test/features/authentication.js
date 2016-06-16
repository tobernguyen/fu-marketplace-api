'use strict';

const helper = require('../helper');
const sinon = require('sinon');
const googleApi = require('../../libs/google-api');
const request = require('supertest');
const app = require('../../app.js');

describe('POST /login', () => {
  let user;
  
  before(done => {
    helper.factory.createUser().then(u => {
      user = u;
      done();
    });
  });
  
  describe('with correct credential', () => {
    it('should return 200 OK', (done) => {
      request(app)
        .post('/login')
        .send({
          email: user.email,
          password: user.__test__.password
        })
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.user.fullName).to.equal(user.fullName);
          expect(res.body.user.email).to.equal(user.email);
          expect(res.body.user.id).to.equal(user.id);
          expect(res.body.token).to.be.ok;
        })
        .expect(200, done);
    });
  });
  
  describe('with incorrect credential', () => {
    it('should return 401 Unauthorized', done => {
      request(app)
        .post('/login')
        .send({
          email: 'wrongggg',
          password: 'password'
        })
        .set('Content-Type', 'application/json')
        .expect(401, done);
    });
  });
});

describe('GET /auth/google/callback', () => {
  describe('with valid code', () => {
    describe('and valid email', () => {
      it('should return access token and user info', done => {
        let getUserProfileStub = sinon.stub(googleApi, 'getUserProfile');
        
        getUserProfileStub.onCall(0).resolves({
          email: 'longlonglong@fpt.edu.vn',
          name: '(FU_K8) Nguyen Hoang Long',
          gender: 'male',
          hd: 'fpt.edu.vn',
          id: '123456789'
        });
        
        request(app)
          .get('/auth/google/callback')
          .query({ code: 'validCode' })
          .expect(res => {
            let resBody = res.body;
            let userInfo = resBody.user;
            expect(resBody.token).to.be.ok;
            expect(userInfo).to.be.ok;
            expect(userInfo.id).to.be.ok;
            expect(userInfo.fullName).to.equal('Nguyen Hoang Long');
            expect(userInfo.gender).to.equal('male');
            expect(userInfo.email).to.equal('longlonglong@fpt.edu.vn');
            
            getUserProfileStub.restore();
          })
          .expect(200, done);
      });
    });
    
    describe('and invalid email', () => {
      it('should return 401', done => {
        let getUserProfileStub = sinon.stub(googleApi, 'getUserProfile');
        
        getUserProfileStub.onCall(0).resolves({
          email: 'longlonglong@google.com'
        });
        
        request(app)
          .get('/auth/google/callback')
          .query({ code: 'validCode' })
          .expect(res => {
            let resBody = res.body;
            expect(resBody.status).to.equal(401);
            expect(resBody.message).to.equal('Please login with email @FPT.EDU.VN');
            expect(resBody.message_code).to.equal('error.authentication.wrong_email_domain');
            
            getUserProfileStub.restore();
          })
          .expect(401, done);
      });
    });
  });
  
  describe('with invalid code', () => {
    it('should return 400', done => {
      let getUserProfileStub = sinon.stub(googleApi, 'getUserProfile');
      
      getUserProfileStub.onCall(0).rejects(new Error('invalid_grant'));
      
      request(app)
        .get('/auth/google/callback')
        .query({ code: 'invalidCode' })
        .expect(res => {
          let resBody = res.body;
          expect(resBody.status).to.equal(400);
          expect(resBody.message).to.equal('Invalid one-time code. Please login again.');
          expect(resBody.message_code).to.equal('error.authentication.invalid_one_time_code');
          
          getUserProfileStub.restore();
        })
        .expect(400, done);
    });
  });
});

describe('GET /api/v1/users/me', () => {
  let user, accessToken;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      user = u;
      accessToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });
  
  describe('with invalid access token', () => {
    it('should return 401 Unauthorized', done => {
      request(app)
        .get('/api/v1/users/me')
        .expect(401, done);
    });
  });
  
  describe('with valid access token', () => {
    it('should return 200 OK with user information', done => {
      request(app)
        .get('/api/v1/users/me')
        .set('X-Access-Token', accessToken)
        .expect(res => {
          expect(res.body.email).to.equal(user.email);
          expect(res.body.fullName).to.equal(user.fullName);
          expect(res.body.id).to.equal(user.id);
          expect(res.body.roles).to.include('seller');
        })
        .expect(200, done);
    });
  });

  describe.only('with seller token', () => {
    let seller, accessToken, shop1, shop2;
    
    before(done => {
      helper.factory.createUserWithRole({}, 'seller').then(u => {
        seller = u;
        accessToken = helper.createAccessTokenForUserId(seller.id);
        return helper.factory.createShop({}, seller.id);
      }).then(s => {
        shop1 = s;
        return helper.factory.createShop({}, seller.id);
      }).then(s => {
        shop2 = s;
        done();
      });
    });

    it('should also return an array of shop this user owned', done => {
      request(app)
        .get('/api/v1/users/me')
        .set('X-Access-Token', accessToken)
        .expect(res => {
          expect(res.body.shops).to.have.lengthOf(2);
          expect(res.body.shops).to.include({id: shop1.id, name: shop1.name});
          expect(res.body.shops).to.include({id: shop2.id, name: shop2.name});
        })
        .expect(200, done);
    });
  });
});

describe('POST /api/v1/users/signOutAll', () => {
  let accessToken;
  
  before(done => {
    helper.factory.createUser().then(u => {
      accessToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });
  
  it('should invalidate all access token of user', done => {
    var checkToken = () => {
      request(app)
        .get('/api/v1/users/me')
        .set('X-Access-Token', accessToken)
        .expect(400, done);
    };
    
    request(app)
      .post('/api/v1/users/signOutAll')
      .set('X-Access-Token', accessToken)
      .expect(200, checkToken);
  });
});
