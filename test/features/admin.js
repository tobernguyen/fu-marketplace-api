'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');

describe('PUT /api/v1/admin/users/:id', () => {
  let userToBeUpdated, normalUserAccessToken, adminToken;
  
  before(done => {
    helper.factory.createUserWithRole({},'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUserWithRole({},'seller');
    }).then(u => {
      userToBeUpdated = u;
      normalUserAccessToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });
  
  describe('with admin access token', () => {
    describe('valid input attribute', () => {
      it('should return 200 OK and return new user profile', done => {
        request(app)
          .put(`/api/v1/admin/users/${userToBeUpdated.id}`)
          .set('X-Access-Token', adminToken)
          .send({
            fullName: 'Nguyen Van A',
            room: 'D222',
            phone: '123123123123',
            gender: 'male',
            identityNumber: '123456789',
            password: '12345678',
            email: 'email@email',
            banned: 'true'
          })
          .set('Content-Type', 'application/json')
          .expect(res => {
            expect(res.body.email).to.equal(userToBeUpdated.email);
            expect(res.body.fullName).to.equal('Nguyen Van A');
            expect(res.body.id).to.equal(userToBeUpdated.id);
            expect(res.body.room).to.equal('D222');
            expect(res.body.phone).to.equal('123123123123');
            expect(res.body.gender).to.equal('male');
            expect(res.body.identityNumber).to.equal('123456789');
            expect(res.body.banned).to.equal(true);
            expect(res.body.password).to.be.undefined;
            expect(res.body.roles).to.include('seller');
          })
          .expect(200, done);  
      });
    }); 
    
    describe('invalid input attribute', () => {
      it('should return 422 and return errors in correct format', done => {
        request(app)
          .put(`/api/v1/admin/users/${userToBeUpdated.id}`)
          .set('X-Access-Token', adminToken)
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
  
  describe('with normal user access token', () => {
    it('should return 403 Forbidden', done => {
      request(app)
        .put(`/api/v1/admin/users/${userToBeUpdated.id}`)
        .set('X-Access-Token', normalUserAccessToken)
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
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.authentication.not_authorized');
        })
        .expect(403, done);  
    });
  });
});


describe('GET /api/v1/admin/users/:id', () => {
  let userToBeUpdated, normalUserAccessToken, adminToken;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      userToBeUpdated = u;
      normalUserAccessToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });
  
  describe('with admin access token', () => {
    it('should return 200 OK and return new user profile', done => {
      request(app)
        .get(`/api/v1/admin/users/${userToBeUpdated.id}`)
        .set('X-Access-Token', adminToken)
        .expect(res => {
          expect(res.body.email).to.equal(userToBeUpdated.email);
          expect(res.body.fullName).to.equal(userToBeUpdated.fullName);
          expect(res.body.id).to.equal(userToBeUpdated.id);
          expect(res.body.room).to.equal(userToBeUpdated.room);
          expect(res.body.phone).to.equal(userToBeUpdated.phone);
          expect(res.body.gender).to.equal(userToBeUpdated.gender);
          expect(res.body.identityNumber).to.equal(userToBeUpdated.identityNumber);
          expect(res.body.banned).to.equal(userToBeUpdated.banned);
          expect(res.body.password).to.be.undefined;
          expect(res.body.roles).to.include('seller');
        })
        .expect(200, done);  
    });
  });
  
  describe('with normal user access token', () => {
    it('should return 403 Forbidden', done => {
      request(app)
        .get(`/api/v1/admin/users/${userToBeUpdated.id}`)
        .set('X-Access-Token', normalUserAccessToken)
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.authentication.not_authorized');
        })
        .expect(403, done);  
    });
  });
});

describe('GET /api/v1/admin/users/', () => {
  let normalUserAccessToken, adminToken;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUser();
    }).then(u => {
      normalUserAccessToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });
  
  describe('with admin access token', () => {
    it('should return 200 OK and return new user profile', done => {
      request(app)
        .get('/api/v1/admin/users/')
        .set('X-Access-Token', adminToken)
        .expect(res => {
          expect(res.body.users).to.be.ok;
        })
        .expect(200, done);  
    });
  });
  
  describe('with normal user access token', () => {
    it('should return 403 Forbidden', done => {
      request(app)
        .get('/api/v1/admin/users/')
        .set('X-Access-Token', normalUserAccessToken)
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.authentication.not_authorized');
        })
        .expect(403, done);  
    });
  });
});

describe('POST /api/v1/admin/users/:id/setRoles', () => {
  let userToBeUpdated, adminToken;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      userToBeUpdated = u;
      done();
    });
  });
  
  describe('clear all roles', () => {
    it('should return 200 OK and return new user profile', done => {
      request(app)
        .post(`/api/v1/admin/users/${userToBeUpdated.id}/setRoles`)
        .set('X-Access-Token', adminToken)
        .send({
          roles: []
        })
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.email).to.equal(userToBeUpdated.email);
          expect(res.body.fullName).to.equal(userToBeUpdated.fullName);
          expect(res.body.id).to.equal(userToBeUpdated.id);
          expect(res.body.room).to.equal(userToBeUpdated.room);
          expect(res.body.phone).to.equal(userToBeUpdated.phone);
          expect(res.body.gender).to.equal(userToBeUpdated.gender);
          expect(res.body.identityNumber).to.equal(userToBeUpdated.identityNumber);
          expect(res.body.banned).to.equal(userToBeUpdated.banned);
          expect(res.body.password).to.be.undefined;
          expect(res.body.roles).to.be.undefined;
        })
        .expect(200, done);  
    });
  });
  
  describe('change role', () => {
    it('should return 200 OK and return new user profile', done => {
      request(app)
        .post(`/api/v1/admin/users/${userToBeUpdated.id}/setRoles`)
        .set('X-Access-Token', adminToken)
        .send({
          roles: ['admin']
        })
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.email).to.equal(userToBeUpdated.email);
          expect(res.body.fullName).to.equal(userToBeUpdated.fullName);
          expect(res.body.id).to.equal(userToBeUpdated.id);
          expect(res.body.room).to.equal(userToBeUpdated.room);
          expect(res.body.phone).to.equal(userToBeUpdated.phone);
          expect(res.body.gender).to.equal(userToBeUpdated.gender);
          expect(res.body.identityNumber).to.equal(userToBeUpdated.identityNumber);
          expect(res.body.banned).to.equal(userToBeUpdated.banned);
          expect(res.body.password).to.be.undefined;
          expect(res.body.roles).to.be.include('admin');
          expect(res.body.roles).to.be.not.include('seller');
        })
        .expect(200, done);  
    });
  });
  
  describe('with invalid role', () => {
    it('should return 200 OK and return new user profile', done => {
      request(app)
        .post(`/api/v1/admin/users/${userToBeUpdated.id}/setRoles`)
        .set('X-Access-Token', adminToken)
        .send({
          roles: ['invalid role']
        })
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.email).to.equal(userToBeUpdated.email);
          expect(res.body.fullName).to.equal(userToBeUpdated.fullName);
          expect(res.body.id).to.equal(userToBeUpdated.id);
          expect(res.body.room).to.equal(userToBeUpdated.room);
          expect(res.body.phone).to.equal(userToBeUpdated.phone);
          expect(res.body.gender).to.equal(userToBeUpdated.gender);
          expect(res.body.identityNumber).to.equal(userToBeUpdated.identityNumber);
          expect(res.body.banned).to.equal(userToBeUpdated.banned);
          expect(res.body.password).to.be.undefined;
          expect(res.body.roles).to.be.include('admin');
          expect(res.body.roles).to.be.not.include('invalid role');
        })
        .expect(200, done);  
    });
  });
  
  describe('with empty json', () => {
    it('should return 200 OK and return new user profile', done => {
      request(app)
        .post(`/api/v1/admin/users/${userToBeUpdated.id}/setRoles`)
        .set('X-Access-Token', adminToken)
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.status).to.equal(422);
          expect(res.body.error).to.equal('Roles must be an array');
        })
        .expect(422, done);  
    });
  });
});
