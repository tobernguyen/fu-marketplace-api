'use strict';

const helper = require('../helper');
const Shop = require('../../models').Shop;
const rewire = require('rewire');
const _ = require('lodash');
const fs = require('fs-extra');

describe('Shop Model', () => {
  describe('factory', () => {
    it('should be valid', done => {
      let createdShop;
      
      helper.factory.createUserWithRole({}, 'seller').then(u => {
        return helper.factory.createShop({ ownerId: u.id});
      }).then(shop => {
        createdShop = shop;
        expect(shop).to.be.ok;
        return Shop.findById(shop.id);
      }).then(shopFromDb => {
        expect(createdShop.fullname).to.equal(shopFromDb.fullname);
        expect(createdShop.email).to.equal(shopFromDb.email);
        done();
      }, done);
    });
    
    describe('#createShopwithShipPlace', () => {      
      it('should create shop with correct ship places', done => {

        helper.factory.createUserWithRole({}, 'seller').then(u => {
          return helper.factory.createShopWithShipPlace({ ownerId: u.id}, 'dom A');
        }).then(shop => {
          expect(shop).to.be.ok;
          return shop.getShipPlaces();
        }).then(shipPlaces => {
          let shopPlaceNames = _.map(shipPlaces, r => r.name);
          expect(shopPlaceNames).to.include('dom A');
          done();
        });
      });
    });
  });
  
  describe('#toJSON', () => {
    it('should omit IGNORE_ATTRIBUTES in result', done => {
      let IGNORE_ATTRIBUTES = rewire('../../models/shop').__get__('IGNORE_ATTRIBUTES');
      
      Shop.findOne().then(shop => {
        let actualJSON = shop.toJSON();
        IGNORE_ATTRIBUTES.forEach(attribute => {
          expect(actualJSON[attribute]).to.be.undefined;
        });
        done();
      });
    });
  });

  describe('hooks', () => {
    describe('afterDestroy', () => {
      let shop;
      let avatarFile = 'public/uploads/shops/avatar.png';
      let coverFile = 'public/uploads/shops/cover.png';
      let checkAvatarFileExist = () => {
        fs.accessSync(avatarFile);
      };
      let checkCoverFileExist = () => {
        fs.accessSync(coverFile);        
      };
      
      beforeEach(done => {
        fs.ensureFileSync(avatarFile);
        fs.ensureFileSync(coverFile);
        
        helper.factory.createShop({
          avatarFile: {
            versions: [
              {
                Location: 'http://localhost:3000/uploads/shops/avatar.png',
                Key: avatarFile
              }  
            ]
          },
          coverFile: {
            versions: [
              {
                Location: 'http://localhost:3000/uploads/shops/cover.png',
                Key: coverFile
              }  
            ]
          }
        }, 1).then(u => {
          shop = u;
          done();
        });
      });
      
      it('should delete all user avatar files after user destroyed', done => {
        shop.destroy().then(() => {
          expect(checkAvatarFileExist).to.throw(Error);
          expect(checkCoverFileExist).to.throw(Error);
          done();
        }, done);
      });
    });
  });
});
