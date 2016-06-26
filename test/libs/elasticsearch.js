'use strict';

var helper = require('../helper');
var rewire = require('rewire');
var elasticsearch = rewire('../../libs/elasticsearch');
var Category = require('../../models').Category;
var Item = require('../../models').Item;
var Shop = require('../../models').Shop;
var ShipPlace = require('../../models').ShipPlace;
var _ = require('lodash');
var elasticsearchHelper = require('../utils/elasticsearch-helper');

describe('libs/elasticsearch', () => {
  describe('#buildShopDocument', () => {
    let seller, shop, item;

    before(done => {
      helper.factory.createUserWithRole({}, 'seller').then(u => {
        seller = u;
        return helper.factory.createShopWithShipPlace({ownerId: u.id}, 'Dom A');
      }).then(s => {
        shop = s;
        return Category.findOne({});
      }).then(category => {
        return helper.factory.createItem({shopId: shop.id, categoryId: category.id, status: Item.STATUS.FOR_SELL});
      }).then(i => {
        item = i;
        done();                
      });
    });

    describe('with valid shopId', () => {
      it('should return a shop document with correct format', done => {
        let buildShopDocument = elasticsearch.__get__('buildShopDocument');
        buildShopDocument(shop.id).then(shopDocument => {
          expect(shopDocument.name).to.equal(shop.name);
          expect(shopDocument.description).to.equal(shop.description);
          expect(shopDocument.avatar).to.equal(shop.avatar);
          expect(shopDocument.cover).to.equal(shop.cover);
          expect(shopDocument.opening).to.equal(shop.opening);
          expect(shopDocument.status).to.equal(shop.status);
          expect(shopDocument.seller.id).to.equal(seller.id);
          expect(shopDocument.seller.fullName).to.equal(seller.fullName);
          expect(shopDocument.items).to.be.an('array');
          expect(shopDocument.items).to.have.lengthOf(1);
          expect(shopDocument.items[0]).to.deep.equal({name: item.name, description: item.description, image: item.image});
          expect(shopDocument.categoryIds).to.be.an('array');
          expect(shopDocument.categoryIds).to.have.lengthOf(1);
          expect(shopDocument.categoryIds).to.include(item.categoryId);
          expect(shopDocument.shipPlaceIds).to.be.an('array');
          expect(shopDocument.shipPlaceIds).to.have.lengthOf(1);
          done();
        }, done);
      });
    }); 
  });

  describe('#searchShop', () => {
    let shops = [], categoryIdToFilter, allCategoryIds;

    before(function(done) {
      this.timeout(5000);

      let promises = [];
      promises[promises.length] = helper.factory.createShop({
        name: 'Alo mình nghe',
        description: 'Hôm nay mình có bán xúc xích luộc, trứng luộc, nước chanh, mong các bạn ủng hộ.',
        opening: true,
        status: Shop.STATUS.PUBLISHED
      });
      promises[promises.length] = helper.factory.createShop({
        name: 'ORIOLE SHOP',
        description: 'HOA QUẢ - NƯỚC NGỌT - BIA - ĐỒ ĂN VẶT - MÌ TÔM',
        opening: false,
        status: Shop.STATUS.PUBLISHED
      });
      promises[promises.length] = helper.factory.createShop({
        name: 'Bá Long Shop',
        description: 'BIG SIZE✦BÁNH MỲ PATE TRỨNG ✦ BÁNH MỲ PATE CHẢ RUỐC ✦ 15K✦TRÀ SỮA SOCOLA ✦ [HẾT TRÀ SỮA THÁI XANH',
        opening: true,
        status: Shop.STATUS.PUBLISHED
      });
      promises[promises.length] = helper.factory.createShop({
        name: 'Vũ Đức Hiếu',
        description: 'BÚN NGAN BÁNH BAO LẠC LUỘC NƯỚC CHANH NƯỚC NGỌT THUỐC LÁ',
        opening: true,
        status: Shop.STATUS.UNPUBLISHED
      });
      promises[promises.length] = helper.factory.createShop({
        name: 'LK Game Store',
        description: 'Hiện mình nhận cung cấp bản quyền game giá rẻ trên steam, giá giao động từ 10->18k/$ tùy từng game. Và qua đêm nay là đến summer sales, đây là cơ hội tốt để mọi người có thể mua game bản quyền với những cái giá không thể rẻ hơn.',
        opening: true,
        status: Shop.STATUS.PUBLISHED
      });

      Promise.all(promises).then(result => {
        shops = result;

        let promises = [];
        // Add ship places shops
        ['Dom A', 'Dom B'].forEach(shipPlaceName => promises[promises.length] = helper.factory.addShipPlaceToShop(shops[0], shipPlaceName));
        ['Dom B', 'Dom C'].forEach(shipPlaceName => promises[promises.length] = helper.factory.addShipPlaceToShop(shops[1], shipPlaceName));
        ['Dom B', 'Dom D'].forEach(shipPlaceName => promises[promises.length] = helper.factory.addShipPlaceToShop(shops[2], shipPlaceName));
        ['Dom D'].forEach(shipPlaceName => promises[promises.length] = helper.factory.addShipPlaceToShop(shops[3], shipPlaceName));
        ['Dom E', 'Dom F', 'Dom B'].forEach(shipPlaceName => promises[promises.length] = helper.factory.addShipPlaceToShop(shops[4], shipPlaceName));

        return Promise.all(promises);
      }).then(() => {
        return Category.findAll({});
      }).then(categories => {
        allCategoryIds = _.map(categories, cat => cat.id);

        // Add random items to shops
        let promises = [];
        _.range(5).forEach(i => {
          _.range(_.random(1, 5)).forEach(() => {
            promises[promises.length] = helper.factory.createItem({
              shopId: shops[i].id,
              categoryId: _.sample(allCategoryIds), // Random category
              status: Item.STATUS.FOR_SELL
            });
          });
        });

        categoryIdToFilter = allCategoryIds[0];
        promises[promises.length] = helper.factory.createItem({
          shopId: shops[0].id, // Shop "Alo mình nghe"
          categoryId: categoryIdToFilter,
          name: 'cơm rang dưa bò',
          description: 'Món cơm rang này của bọn mình có dưa xào với bò, ăn rất ngon, bổ rẻ, thịt tươi.',
          status: Item.STATUS.FOR_SELL
        });

        return Promise.all(promises);
      }).then(() => {
        return elasticsearchHelper.refreshIndexNow();
      }).then(() => {
        done();
      }).catch(done);
    });

    after(done => {
      let promises = _.map(shops, s => s.destroy({force: true}));
      Promise.all(promises).then(() => done(), done);
    });

    describe('with one empty agruments', done => {
      it('should return search result contains published shops and from opening shops to closing shops', done => {
        elasticsearch.searchShop().then(resp => {
          expect(resp.hits.total).to.equal(4);
          expect(resp.hits.hits).to.be.an('Array');
          expect(resp.hits.hits).to.have.lengthOf(4); // Because we have one unpublised shops

          let firstShop = resp.hits.hits[0];
          let expectedFirstShop = shops[_.findIndex(shops, s => s.id == firstShop['_id'])];
          let actualFirstShopData = firstShop['_source'];
          expect(actualFirstShopData.name).to.equal(expectedFirstShop.name);
          expect(actualFirstShopData.description).to.equal(expectedFirstShop.description);
          expect(actualFirstShopData.opening).to.equal(expectedFirstShop.opening);
          expect(actualFirstShopData.status).to.equal(expectedFirstShop.status);

          let lastShop = resp.hits.hits[3];
          let actualLastShopData = lastShop['_source'];
          expect(actualLastShopData.name).to.equal('ORIOLE SHOP'); // The closed shop should be on the bottom

          expectedFirstShop.getUser().then(seller => {
            expect(actualFirstShopData.seller).to.deep.equal({id: seller.id, fullName: seller.fullName});
            return expectedFirstShop.getShipPlaces();
          }).then(shipPlaces => {
            expect(actualFirstShopData.shipPlaceIds).to.deep.equal(_.map(shipPlaces, sp => sp.id));
            return expectedFirstShop.getItems();
          }).then(items => {
            expect(actualFirstShopData.items).to.have.lengthOf(items.length);
            actualFirstShopData.items.forEach(item => {
              expect(item.image).to.be.a('String');
            });
            done();
          });
        }).catch(done);
      });
    });

    describe('with the hash contain keyword', function() {
      it('should return search result contain shop relevant to keyword', done => {
        elasticsearch.searchShop({
          keyword: 'bản quyền game'
        }).then(resp => {
          let firstShop = resp.hits.hits[0];
          let firstShopData = firstShop['_source'];
          expect(firstShopData.name).to.equal('LK Game Store');
          expect(firstShopData.description).to.equal('Hiện mình nhận cung cấp bản quyền game giá rẻ trên steam, giá giao động từ 10->18k/$ tùy từng game. Và qua đêm nay là đến summer sales, đây là cơ hội tốt để mọi người có thể mua game bản quyền với những cái giá không thể rẻ hơn.');
          
          return elasticsearch.searchShop({
            keyword: 'tra sua' // Shop "Bá Long Shop" contains "trà sữa" in description
          });
        }).then(resp => {
          let firstShopData = resp.hits.hits[0]['_source'];
          expect(firstShopData.name).to.equal('Bá Long Shop');
          
          return elasticsearch.searchShop({
            keyword: 'com rang dua bo' // Shop "Alo mình nghe" contains an item have name: "cơm rang dưa bò"
          });
        }).then(resp => {
          let firstShopData = resp.hits.hits[0]['_source'];
          expect(firstShopData.name).to.equal('Alo mình nghe');

          return shops[0].getUser();
        }).then(seller => {
          return elasticsearch.searchShop({
            keyword: seller.fullName  // Test search shop by seller name
          });
        }).then(resp => {
          let firstShopData = resp.hits.hits[0]['_source'];
          expect(firstShopData.name).to.equal(shops[0].name);
          
          done();
        }).catch(done);
      });
    });

    describe('with the hash contain categoryIds', () => {
      it('should return search result contain shop having item belong to categoryIds', done => {
        let randomCategoryId = _.sample(allCategoryIds);
        elasticsearch.searchShop({
          categoryIds: [randomCategoryId]
        }).then(resp => {
          resp.hits.hits.forEach(shop => {
            let shopData = shop['_source'];
            expect(shopData.categoryIds).to.include(randomCategoryId);
          });
          done();
        }).catch(done);
      });
    });

    describe('with the hash contain shipPlaceId', () => {
      it('should return search result contain shop that ship to shipPlaceId only', done => {
        let allShipPlaces;

        ShipPlace.findAll({}).then(spl => {
          allShipPlaces = spl;

          let shipPlaceDomB = _.find(allShipPlaces, spl => spl.name === 'Dom B');
          return elasticsearch.searchShop({
            shipPlaceId: shipPlaceDomB.id
          });
        }).then(resp => {
          expect(resp.hits.total).to.equal(4); // There are 4 published shops ship to Dom B
          
          let shipPlaceDomD = _.find(allShipPlaces, spl => spl.name === 'Dom D');
          return elasticsearch.searchShop({
            shipPlaceId: shipPlaceDomD.id
          });
        }).then(resp => {
          expect(resp.hits.total).to.equal(1); // There are 1 published shops ship to Dom D only
          let firstShopData = resp.hits.hits[0]['_source'];
          expect(firstShopData.name).to.equal('Bá Long Shop');

          done();
        }).catch(done);
      });
    });

    describe('with the hash contain size keys', () => {
      it('should return search result with limited shops per page according to value of size', done => {
        elasticsearch.searchShop({size: 1}).then(resp => {
          expect(resp.hits.hits).to.have.lengthOf(1);
          done();
        });
      });
    });

    describe('with the hash contain page keys', () => {
      before(function(done) {
        this.timeout(5000);

        let promises = _.map(_.range(1,14), i => {
          return helper.factory.createShop({
            opening: true,
            status: Shop.STATUS.PUBLISHED
          });
        });

        return Promise.all(promises).then(s => {
          return elasticsearchHelper.refreshIndexNow();
        }).then(() => done(), done);
      });

      it('should return correct record for passed page', done => {
        elasticsearch.searchShop().then((resp) => {
          let expectedPerPage = elasticsearch.__get__('DEFAULT_PER_PAGE');
          expect(resp.hits.total).to.equal(17);
          expect(resp.hits.hits).to.have.lengthOf(expectedPerPage);

          return elasticsearch.searchShop({page: 2});
        }).then(resp => {
          let expectedPerPage = elasticsearch.__get__('DEFAULT_PER_PAGE');
          expect(resp.hits.hits).to.have.lengthOf(expectedPerPage);

          return elasticsearch.searchShop({page: 3});
        }).then(resp => {
          let expectedPerPage = elasticsearch.__get__('DEFAULT_PER_PAGE');
          expect(resp.hits.hits).to.have.lengthOf(expectedPerPage);

          return elasticsearch.searchShop({page: 4});
        }).then(resp => {
          let expectedPerPage = elasticsearch.__get__('DEFAULT_PER_PAGE');
          expect(resp.hits.hits).to.have.lengthOf(17 - expectedPerPage*3);

          return elasticsearch.searchShop({page: 5});
        }).then(resp => {
          expect(resp.hits.hits).to.have.lengthOf(0);

          done();
        }).catch(done);
      });
    });
  });
});
