'use strict';

const helper = require('../helper');
const Shop = require('../../models').Shop;
const rewire = require('rewire');
const _ = require('lodash');
const fs = require('fs-extra');
const sinon = require('sinon');
const elasticsearch = require('../../libs/elasticsearch');

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
    describe('afterCreate', () => {
      let shop;
      let elasticsearchSpy;
      beforeEach(done => {
        elasticsearchSpy = sinon.spy(elasticsearch, 'indexShopById');
        helper.factory.createShop({}, 1).then(s => {
          shop = s;
          done();
        });
      });

      afterEach(() => {
        elasticsearch.indexShopById.restore();
      });

      it('should call elasticsearch.indexShopById', done => {
        expect(elasticsearchSpy.withArgs(shop.id).calledOnce).to.be.true;
        done();
      });
    });

    describe('afterUpdate', () => {
      let shop;
      let elasticsearchSpy;
      beforeEach(done => {
        helper.factory.createShop({}, 1).then(s => {
          elasticsearchSpy = sinon.spy(elasticsearch, 'indexShopById');
          shop = s;
          done();
        });
      });

      afterEach(() => {
        elasticsearch.indexShopById.restore();
      });

      it('should call elasticsearch.indexShopById', done => {
        shop.update({name: 'Updated name'}).then(_ => {
          expect(elasticsearchSpy.withArgs(shop.id).calledOnce).to.be.true;
          done();
        });
      });
    });

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
      let elasticsearchSpy;
      
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
          elasticsearchSpy = sinon.spy(elasticsearch, 'deleteShopIndexById');
          done();
        });
      });

      afterEach(() => {
        elasticsearch.deleteShopIndexById.restore();
      });
      
      it('should delete all user avatar files after user destroyed', done => {
        shop.destroy().then(() => {
          expect(checkAvatarFileExist).to.throw(Error);
          expect(checkCoverFileExist).to.throw(Error);
          done();
        }, done);
      });

      it('should call elasticsearch.deleteShopIndexById', done => {
        shop.destroy().then(() => {
          expect(elasticsearchSpy.withArgs(shop.id).calledOnce).to.be.true;
          done();
        });
      });
    });
  });
});
