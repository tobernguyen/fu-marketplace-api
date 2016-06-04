'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const User = require('../../models').User;

describe('PUT /api/v1/users/me', () => {
  let user, accessToken;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      user = u;
      accessToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });
  
  describe('with valid access token and ', () => {
    describe('valid input attribute', () => {
      it('should return 200 OK and return new user profile', done => {
        request(app)
          .put('/api/v1/users/me')
          .set('X-Access-Token', accessToken)
          .send({
            fullName: 'Nguyen Van A',
            room: 'D222',
            phone: '123123123123',
            gender: 'male',
            identityNumber: '123456789',
            password: '12345678',
            email: 'email@email'
          })
          .set('Content-Type', 'application/json')
          .expect(res => {
            expect(res.body.email).to.equal(user.email);
            expect(res.body.fullName).to.equal('Nguyen Van A');
            expect(res.body.id).to.equal(user.id);
            expect(res.body.room).to.equal('D222');
            expect(res.body.phone).to.equal('123123123123');
            expect(res.body.gender).to.equal('male');
            expect(res.body.identityNumber).to.equal('123456789');
            expect(res.body.roles).to.include('seller');
          })
          .expect(200, done);  
      });
    }); 
    
    describe('invalid input attribute', () => {
      it('should return 422 and return errors in correct format', done => {
        request(app)
          .put('/api/v1/users/me')
          .set('X-Access-Token', accessToken)
          .send({
            identityNumber: '12345678',
            fullName: ''
          })
          .set('Content-Type', 'application/json')
          .expect(res => {
            expect(res.body.status).to.equal(422);
            expect(res.body.errors.identityNumber).to.be.ok;
            expect(res.body.errors.identityNumber.message_code).to.equal('error.model.validation_len_failed');
            expect(res.body.errors.fullName).to.be.ok;
            expect(res.body.errors.fullName.message_code).to.equal('error.model.validation_len_failed');
          })
          .expect(422, done);
      });
    });
  });
});

describe('POST /api/v1/users/me/uploadAvatar', () => {
  let user, accessToken;
  
  before(done => {
    helper.factory.createUser().then(u => {
      user = u;
      accessToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });
  
  describe('with valid access token and ', () => {
    describe('valid image file', () => {
      it('should return 200 and return user with valid avatar file', done => {
        request(app)
          .post('/api/v1/users/me/uploadAvatar')
          .set('X-Access-Token', accessToken)
          .attach('file', 'test/fixtures/user-avatar.jpg')
          .expect(res => {
            expect(res.body.id).to.equal(user.id);
            expect(res.body.avatar).to.have.string(`users/${user.id}/avatar-small.jpg`);
          })
          .expect(200, done);  
      });
    });
    
    describe('invalid image file', () => {
      it('should return 422 and inform client file is invalid', done => {
        request(app)
          .post('/api/v1/users/me/uploadAvatar')
          .set('X-Access-Token', accessToken)
          .attach('file', 'test/fixtures/invalid-image.txt')
          .expect(res => {
            expect(res.body.status).to.equal(422);
            expect(res.body.message).to.equal('Only PNG and JPEG file is allowed');
          })
          .expect(422, done);
      });
    });
    
    describe('image file is too big', () => {
      let originalMaximumAvatarSize;
      
      before(() => {
        originalMaximumAvatarSize = User.MAXIMUM_AVATAR_SIZE;
        User.MAXIMUM_AVATAR_SIZE = 1024; // Allow 1KB file only
      });
      
      after(() => {
        User.MAXIMUM_AVATAR_SIZE = originalMaximumAvatarSize;
      });
      
      it('should return 406 and inform client file is too big', done => {
        request(app)
          .post('/api/v1/users/me/uploadAvatar')
          .set('X-Access-Token', accessToken)
          .attach('file', 'test/fixtures/user-avatar.jpg')
          .expect(res => {
            expect(res.body.status).to.equal(406);
            expect(res.body.message).to.equal('File is too big. Maximum file size allow: 1KB');
          })
          .expect(406, done);
      });
    }); 
  });
});