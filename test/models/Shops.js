'use strict';

const helper = require('../helper');
const Shop = require('../../models').Shop;
const rewire = require('rewire');
const _ = require('lodash');

describe('Shop Model', () => {
  describe('factory', () => {
    it('should be valid', done => {
      let createdShop;
      
      helper.factory.createUserWithRole({}, 'seller').then(u => {
        return helper.factory.createShop({}, u.id);
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
    
    describe('#createShopwithShipPlac', () => {      
      it('should create shop with correct ship places', done => {

        helper.factory.createUserWithRole({}, 'seller').then(u => {
          return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
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
});
