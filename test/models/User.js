'use strict';

const helper = require('../helper');
const User = require('../../models').User;
const bcrypt = require('bcrypt');
const rewire = require('rewire');
const tk = require('timekeeper');
const _ = require('lodash');
const fs = require('fs-extra');

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
    
    describe('after destroy', () => {
      let user;
      let avatarFile = 'public/uploads/users/test.png';
      let identityPhotoFile = 'public/uploads/users/identityPhoto.png';
      let checkAvatarFileExist = () => {
        fs.accessSync(avatarFile);
      };
      let checkIdentityFileExist = () => {
        fs.accessSync(identityPhotoFile);        
      };
      
      beforeEach(done => {
        fs.ensureFileSync(avatarFile);
        fs.ensureFileSync(identityPhotoFile);
        
        helper.factory.createUser({
          avatarFile: {
            versions: [
              {
                Location: 'http://localhost:3000/uploads/users/test.png',
                Key: avatarFile
              }  
            ]
          },
          identityPhotoFile: {
            versions: [
              {
                Location: 'http://localhost:3000/uploads/users/identityPhoto.png',
                Key: identityPhotoFile
              }  
            ]
          }
        }).then(u => {
          user = u;
          done();
        });
      });
      
      it('should delete all user avatar files after user destroyed', done => {
        user.destroy().then(() => {
          expect(checkAvatarFileExist).to.throw(Error);
          expect(checkIdentityFileExist).to.throw(Error);
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

  describe('#getBasicSellerInfo', () => {
    let seller;

    before(done => {
      helper.factory.createUserWithRole({}, 'seller').then(s => {
        seller = s;
        done();
      });
    });

    it('should return seller information of current user', done => {
      let BASIC_SELLER_INFO_FIELD = rewire('../../models/user').__get__('BASIC_SELLER_INFO_FIELD');
      let actualJSON = seller.getBasicSellerInfo();
      expect(actualJSON).to.contain.all.keys(BASIC_SELLER_INFO_FIELD.concat('identityPhoto'));
      done();
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

  describe('#verifyRole', () => {
    let user;

    before(done => {
      helper.factory.createUserWithRole({}, 'seller').then(u => {
        user = u;
        done();
      });
    });

    it('should verify if user has specific role', done => {
      user.verifyRole('seller').then(isSeller => {
        expect(isSeller).to.be.true;

        return user.verifyRole('admin');
      }).then(isAdmin => {
        expect(isAdmin).to.be.false;
        done();
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
