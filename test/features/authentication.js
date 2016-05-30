'use strict';

const helper = require('../helper');
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
        .expect(200)
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

describe.skip('POST /login/google', () => {
  describe('with valid code', () => {
    describe('with valid email', () => {
      it('should return access token and user info', done => {
        request(app)
          .post('/login/google')
          .field('code', 'validCode')
          .expect(res => {
            let resBody = res.body;
            let userInfo = resBody.user;
            expect(resBody.token).to.be.ok;
            expect(userInfo).to.be.ok;
            expect(userInfo.id).to.be.ok;
            expect(userInfo.fullName).to.be.ok;
            expect(userInfo.email).to.be.ok;
          });
      });
    });
  });
});

describe('GET /api/v1/users/me', () => {
  let user, accessToken;
  
  before(done => {
    helper.factory.createUser().then(u => {
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
