'use strict';

const helper = require('../helper');
const User = require('../../models').User;
const bcrypt = require('bcrypt');
const rewire = require('rewire');
const tk = require('timekeeper');
const _ = require('lodash');

describe('User Model', () => {
  describe('factory', () => {
    it('should be valid', done => {
      let createdUser;
      
      helper.factory.createUser().then(user => {
        createdUser = user;
        expect(user).to.be.ok;
        
        return User.findById(user.id);
      }).then(userFromDb => {
        expect(createdUser.fullname).to.equal(userFromDb.fullname);
        expect(createdUser.email).to.equal(userFromDb.email);
        done();
      }, done);
    });
    
    describe('#createUserWithRole', () => {      
      it('should create user with correct role', done => {
        helper.factory.createUserWithRole({}, 'admin').then(user => {
          expect(user).to.be.ok;
          
          return user.getRoles();
        }).then(roles => {
          let roleNames = _.map(roles, r => r.name);
          expect(roleNames).to.include('admin');
          done();
        });
      });
    });
  });
  
  describe('hooks', () => {
    describe('before create', () => {
      it('should hash the input password using brypt', done => {
        let password = 'test123123';
        
        helper.factory.createUser({password: password}).then(user => {
          expect(bcrypt.compareSync(password, user.password)).to.be.true;
          done();
        }, done);
      });
    });
    
    describe('before update', () => {
      it('should hash the input password using brypt', done => {
        let password = 'newpassword123';
        
        User.findOne().then(user => {
          return user.update({password: password});
        }).then(user => {
          expect(bcrypt.compareSync(password, user.password)).to.be.true;
          done();
        }, done);
      });
    });
  });
  
  describe('#toJSON', () => {
    it('should omit IGNORE_ATTRIBUTES in result', done => {
      let IGNORE_ATTRIBUTES = rewire('../../models/user').__get__('IGNORE_ATTRIBUTES');
      
      User.findOne().then(user => {
        let actualJSON = user.toJSON();
        IGNORE_ATTRIBUTES.forEach(attribute => {
          expect(actualJSON[attribute]).to.be.undefined;
        });
        done();
      });
    });
  });
  
  describe('#verifyPassword', () => {
    it('should verify if the input password is correct for user instance', () => {
      let correctPassword = 'correctPassword123';
      
      return helper.factory.createUser({password: correctPassword}).then(user => {
        return Promise.all([
          expect(user.verifyPassword(correctPassword)).to.eventually.equal(true),
          expect(user.verifyPassword(correctPassword + 'wrong')).to.eventually.equal(false)
        ]);
      });
    });
  });
  
  describe('#signOutAll', () => {
    let expectedTime;
    
    before(() => {
      expectedTime = new Date();
      tk.freeze(expectedTime);
    });
    
    after(() => {
      tk.reset();
    });
    
    it('should set acceptTokenAfter to current date', done => {
      let affectUser;
      
      User.findOne().then(user => {
        affectUser = user;
        return user.signOutAll();
      }).then(() => {
        return User.findById(affectUser.id);
      }).then(user => {
        expect(user.acceptTokenAfter.getTime()).to.equal(expectedTime.getTime());
        done();
      });
    });
  });
});
