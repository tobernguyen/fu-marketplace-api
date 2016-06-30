'use strict';

const helper = require('../helper');
const Category = require('../../models').Category;
const Item = require('../../models').Item;
const rewire = require('rewire');
const fs = require('fs-extra');
const sinon = require('sinon');
const elasticsearch = require('../../libs/elasticsearch');

describe('Item Model', () => {
  describe('factory', () => {
    it('should be valid', done => {
      let createdItem, shop;
      helper.factory.createUserWithRole({}, 'seller').then(u => {
        return helper.factory.createShopWithShipPlace({ ownerId: u.id}, 'dom A');
      }).then(s => {
        shop = s;
        return Category.findOne({
          where: {
            name: 'Bánh mỳ'
          }
        }); //we already have default category when doing migrate
      }).then(c => {
        return helper.factory.createItem({
          shopId: shop.id,
          categoryId: c.id
        });
      }).then(item => {
        createdItem = item;
        expect(item).to.be.ok;
        return Item.findById(item.id);
      }).then(itemFromDb => {
        expect(createdItem.name).to.equal(itemFromDb.name);
        expect(createdItem.price).to.equal(itemFromDb.price);
        done();
      }, done);
    });
  });
  
  describe('#toJSON', () => {
    it('should omit IGNORE_ATTRIBUTES in result', done => {
      let IGNORE_ATTRIBUTES = rewire('../../models/item').__get__('IGNORE_ATTRIBUTES');
      
      Item.findOne().then(item => {
        let actualJSON = item.toJSON();
        IGNORE_ATTRIBUTES.forEach(attribute => {
          expect(actualJSON[attribute]).to.be.undefined;
        });

        expect(actualJSON.quantity).to.equal((item.quantity < 0) ? 0 : item.quantity); 
        done();
      });
    });
  });

  describe('hooks', () => {
    describe('afterCreate', () => {
      describe('item created with status is not for sell', () => {
        let elasticsearchSpy;

        beforeEach(done => {
          helper.factory.createShop({}).then(shop => {
            elasticsearchSpy = sinon.spy(elasticsearch, 'indexShopById');
            return helper.factory.createItem({shopId: shop.id, categoryId: 1, status: 0});
          }).then(() => {
            done();
          });
        });

        afterEach(() => {
          elasticsearch.indexShopById.restore();
        });

        it('should not call elasticsearch.indexShopById', done => {
          expect(elasticsearchSpy.callCount).to.equal(0);
          done();
        });
      });

      describe('item created with status is for sell', () => {
        let elasticsearchSpy;
        let shop;

        beforeEach(done => {
          helper.factory.createShop({}).then(s => {
            shop = s;
            elasticsearchSpy = sinon.spy(elasticsearch, 'indexShopById');
            return helper.factory.createItem({shopId: s.id, categoryId: 1, status: Item.STATUS.FOR_SELL});
          }).then(s => {
            done();
          });
        });

        afterEach(() => {
          elasticsearch.indexShopById.restore();
        });

        it('should not call elasticsearch.indexShopById', done => {
          expect(elasticsearchSpy.withArgs(shop.id).calledOnce).to.be.true;
          done();
        });
      });
    });

    describe('afterUpdate', () => {
      let item;
      let elasticsearchSpy;
      beforeEach(done => {
        helper.factory.createShop({}).then(shop => {
          return helper.factory.createItem({shopId: shop.id, categoryId: 1, status: 0});
        }).then(i => {
          item = i;
          elasticsearchSpy = sinon.spy(elasticsearch, 'indexShopById');
          done();
        });
      });


      afterEach(() => {
        elasticsearch.indexShopById.restore();
      });

      it('should call elasticsearch.indexShopById', done => {
        item.update({name: 'Updated name'}).then(_ => {
          expect(elasticsearchSpy.withArgs(item.shopId).calledOnce).to.be.true;
          done();
        });
      });
    });

    describe('afterDestroy', () => {
      let item;
      let imageFile = 'public/uploads/shops/image.png';
      let checkImageFileExist = () => {
        fs.accessSync(imageFile);
      };
      let elasticsearchSpy;

      beforeEach(done => {
        fs.ensureFileSync(imageFile);

        let shop;
        helper.factory.createUserWithRole({}, 'seller').then(u => {
          return helper.factory.createShopWithShipPlace({ ownerId: u.id}, 'dom A');
        }).then(s => {
          shop = s;
          return Category.findOne({
            where: {
              name: 'Bánh mỳ'
            }
          }); //we already have default category when doing migration
        }).then(c => {
          return helper.factory.createItem({
            imageFile: {
              versions: [
                {
                  Location: 'http://localhost:3000/uploads/shops/image.png',
                  Key: imageFile
                }  
              ]
            },
            shopId: shop.id,
            categoryId: c.id
          });
        }).then(i => {
          item = i;
          elasticsearchSpy = sinon.spy(elasticsearch, 'indexShopById');
          done();
        });
      });

      afterEach(() => {
        elasticsearch.indexShopById.restore();
      });
      
      it('should delete all user image files after user destroyed', done => {
        item.destroy().then(() => {
          expect(checkImageFileExist).to.throw(Error);
          done();
        }, done);
      });

      it('should call elasticsearch.indexShopById', done => {
        item.destroy().then(() => {
          expect(elasticsearchSpy.withArgs(item.shopId).calledOnce).to.be.true;
          done();
        });
      });
    });
  });
});
