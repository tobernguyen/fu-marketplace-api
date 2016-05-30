'use strict';

require('../helper');
const rewire = require('rewire');
const httpMocks = require('node-mocks-http');
const jwt = require('jsonwebtoken');
const tk = require('timekeeper');
const moment = require('moment');
const validateTokenMW = rewire('../../middlewares/validateToken');
const sinon = require('sinon');

describe('validateToken middleware', () => {  
  it('should be a function', () => {
    expect(validateTokenMW).to.be.a('function');
  });
  
  describe('when request does not contain access token', () => {
    it('should reject the request with code 401', () => {
      var request  = httpMocks.createRequest();
      var response = httpMocks.createResponse();
      validateTokenMW(request, response);
      expect(response.statusCode).to.equal(401);
    });
  });
  
  describe('when request contain invalid access token', () => {
    it('should reject the request with code 401', done => {
      var request  = httpMocks.createRequest({
        headers: {
          'x-access-token': 'invalid.token'
        }
      });
      var response = httpMocks.createResponse({
        eventEmitter: require('events').EventEmitter
      });
      validateTokenMW(request, response);
      response.on('end', () => {
        expect(response.statusCode).to.equal(401);
        done();     
      });
    });
  });
  
  describe('when request contain expired access token', () => {    
    afterEach(() => {
      tk.reset();
    });
    
    it('should reject the request with code 400', done => {
      var request  = httpMocks.createRequest({
        headers: {
          'x-access-token': jwt.sign({id: 1}, process.env.TOKEN_SECRET, {
            expiresIn: 60
          })
        }
      });
      
      tk.travel(moment().add(1, 'day').toDate());
      
      var response = httpMocks.createResponse({
        eventEmitter: require('events').EventEmitter
      });
      
      validateTokenMW(request, response);
      
      response.on('end', () => {
        expect(response.statusCode).to.equal(400);
        done();
      });
    });
  });
  
  describe('when request contain valid access token', () => {
    it('should pass request to next middleware', done => {
      var spyNext = sinon.spy(() => {
        expect(stubValidateUser.calledOnce).to.be.true;
        expect(spyNext.calledOnce).to.be.true;
        expect(request.user).to.equal(fakeUser);
        done();
      });
      var stubValidateUser = sinon.stub();
      var fakeUser = {id: 1};
      var tokenPayload = {id: 1};
      
      stubValidateUser.returns(fakeUser);
      
      var request  = httpMocks.createRequest({
        headers: {
          'x-access-token': jwt.sign(tokenPayload, process.env.TOKEN_SECRET, {
            expiresIn: '2 days'
          })
        }
      });
      var response = httpMocks.createResponse();
      
      validateTokenMW.__set__('validateUser', stubValidateUser);
      validateTokenMW(request, response, spyNext);
    });
  });
});
