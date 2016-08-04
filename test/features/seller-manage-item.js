'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const Category = require('../../models').Category;
const Item = require('../../models').Item;

var _ = require('lodash');

describe('GET /api/v1/seller/shops/:shopId/items', () => {
  let  seller, shop1, shop2, sellerToken, category, items;

  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      seller = u;
      sellerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({ ownerId: u.id}, 'dom A');
    }).then(s => {
      shop1 = s;
      return Category.findOne({
        where: {
          name: 'Bánh mỳ'
        }
      }); //we already have default category when doing migration
    }).then(c => {
      category = c;
      return helper.factory.createItem({
        shopId: shop1.id,
        categoryId: c.id,
        sort: 2
      });
    }).then(i => {
      items = [i];
      return helper.factory.createItem({
        shopId: i.shopId,
        categoryId: i.categoryId,
        sort: 1
      });
    }).then(i => {
      items[items.length] = i;
      return helper.factory.createShopWithShipPlace({ ownerId: seller.id}, 'dom A');
    }).then(s => {
      shop2 = s;
      done();
    });
  });

  describe('with shop have item', () => {
    it('should return 200 OK and return non-empty array contain info of items in shops', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop1.id}/items`)
        .set('X-Access-Token', sellerToken)
        .expect(res => {
          let sortedItems = _.sortBy(items, 'sort', 'id');
          expect(res.body.items).to.have.lengthOf(2);
          _([0,1]).forEach(function(value) {
            let i = res.body.items[value];
            let item = sortedItems[value];
            expect(i.id).to.equal(item.id);
            expect(i.sort).to.equal(item.sort);
            expect(i.description).to.equal(item.description);
            expect(i.image).to.equal(item.image);
            expect(i.price).to.equal(item.price);
            expect(i.name).to.equal(item.name);
            expect(i.shopId).to.equal(shop1.id);
            expect(i.categoryId).to.equal(category.id);
          });
        })
        .expect(200, done);
    });
  });

  describe('with do not have item', () => {
    it('should return 200 OK and return empty array contain info of items in shops', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop2.id}/items`)
        .set('X-Access-Token', sellerToken)
        .expect(res => {
          expect(res.body.items).to.have.lengthOf(0);
          expect(res.body.items).to.be.instanceOf(Array);
        })
        .expect(200, done);
    });
  });
});

describe('POST /api/v1/seller/shops/:shopId/items', () => {
  let  shop, sellerToken, category;

  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      sellerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({ ownerId: u.id}, 'dom A');
    }).then(s => {
      shop = s;
      return Category.findOne({
        where: {
          name: 'Bánh mỳ'
        }
      }); //we already have default category when doing migration
    }).then(c => {
      category = c;
      done();
    });
  });

  describe('with valid item attribute via multipart form', () => {
    it('should return 200 with new item information', done => {
      request(app)
        .post(`/api/v1/seller/shops/${shop.id}/items`)
        .set('X-Access-Token', sellerToken)
        .attach('imageFile', 'test/fixtures/user-avatar.jpg')
        .field('name', 'TRÀ THÁI XANH MIX THẠCH - KHÔNG THẠCH')
        .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
        .field('quantity', 300)
        .field('price', 15000)
        .field('status', Item.STATUS.FOR_SELL)
        .field('sort', 0)
        .field('categoryId', category.id)
        .expect(res => {
          let body = res.body;
          expect(body.name).to.equal('TRÀ THÁI XANH MIX THẠCH - KHÔNG THẠCH');
          expect(body.description).to.equal('Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ');
          expect(body.quantity).to.equal(300);
          expect(body.price).to.equal(15000);
          expect(body.status).to.equal(Item.STATUS.FOR_SELL);
          expect(body.sort).to.equal(0);
          expect(body.categoryId).to.equal(category.id);
          expect(body.image).to.have.string(`/shops/${shop.id}/items/`);
        })
        .expect(200, done);
    });
  });

  describe('with 50 char item name via multipart form', () => {
    it('should return 200 with new item information', done => {
      request(app)
          .post(`/api/v1/seller/shops/${shop.id}/items`)
          .set('X-Access-Token', sellerToken)
          .attach('imageFile', 'test/fixtures/user-avatar.jpg')
          .field('name', 'Bun ca nhap khau nguyen chiec Hoa Ky An Do Hoa Lac')
          .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
          .field('quantity', 300)
          .field('price', 15000)
          .field('status', Item.STATUS.FOR_SELL)
          .field('sort', 0)
          .field('categoryId', category.id)
          .expect(res => {
            let body = res.body;
            expect(body.name).to.equal('Bun ca nhap khau nguyen chiec Hoa Ky An Do Hoa Lac');
          })
          .expect(200, done);
    });
  });

  describe('with 51 char item name via multipart form', () => {
    it('should return 200 with new item information', done => {
      request(app)
          .post(`/api/v1/seller/shops/${shop.id}/items`)
          .set('X-Access-Token', sellerToken)
          .attach('imageFile', 'test/fixtures/user-avatar.jpg')
          .field('name', 'Bun ca nhap khau nguyen chiec Hoa Ky An Do Hoa  Lac')
          .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
          .field('quantity', 300)
          .field('price', 15000)
          .field('status', Item.STATUS.FOR_SELL)
          .field('sort', 0)
          .field('categoryId', category.id)
          .expect(res => {
            expect(res.body.status).to.equal(400);
            let errors = res.body.errors;
            expect(_.toPairs(errors)).to.have.lengthOf(1);
            expect(errors.name.message).to.equal('Length of name must be in [1, 50]');
            expect(errors.name.message_code).to.equal('error.form.validation_len_failed');
          })
          .expect(400, done);
    });
  });

  describe('with some invalid fields in multipart form data', () => {
    it('should return 400 with message about invalid fields', done => {
      request(app)
        .post(`/api/v1/seller/shops/${shop.id}/items`)
        .set('X-Access-Token', sellerToken)
        .attach('imageFile', 'test/fixtures/user-avatar.jpg')
        .field('name', '')
        .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
        .field('quantity', 300)
        .field('price', 15000)
        .field('status', 9999999)
        .field('sort', 0)
        .field('categoryId', category.id)
        .expect(res => {
          expect(res.body.status).to.equal(400);
          let errors = res.body.errors;
          expect(_.toPairs(errors)).to.have.lengthOf(2);
          expect(errors.name.message).to.equal('Length of name must be in [1, 50]');
          expect(errors.name.message_code).to.equal('error.form.validation_len_failed');
          expect(errors.status.message).to.equal('Provided status is not valid');
          expect(errors.status.message_code).to.equal('error.form.validation_data_failed');
        })
        .expect(400, done);
    });
  });

  describe('with invalid image file', () => {
    it('should return 400 with message about invalid image', done => {
      request(app)
        .post(`/api/v1/seller/shops/${shop.id}/items`)
        .set('X-Access-Token', sellerToken)
        .attach('imageFile', 'test/fixtures/invalid-image.txt')
        .field('name', 'TRÀ THÁI XANH MIX THẠCH - KHÔNG THẠCH')
        .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
        .field('quantity', 300)
        .field('price', 15000)
        .field('status', Item.STATUS.FOR_SELL)
        .field('sort', 0)
        .field('categoryId', category.id)
        .expect(res => {
          expect(res.body.status).to.equal(400);
          let errors = res.body.errors;
          expect(_.toPairs(errors)).to.have.lengthOf(1);
          expect(errors.imageFile.message).to.equal('Only PNG and JPEG file is allowed');
          expect(errors.imageFile.message_code).to.equal('error.upload.invalid_image_format');
        })
        .expect(400, done);
    });
  });

  describe('without image file', () => {
    it('should return 400 with message about invalid image', done => {
      request(app)
        .post(`/api/v1/seller/shops/${shop.id}/items`)
        .set('X-Access-Token', sellerToken)
        .field('name', 'TRÀ THÁI XANH MIX THẠCH - KHÔNG THẠCH')
        .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
        .field('quantity', 300)
        .field('price', 15000)
        .field('status', Item.STATUS.FOR_SELL)
        .field('sort', 0)
        .field('categoryId', category.id)
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.message).to.equal('Item must contain image');
          expect(res.body.message_code).to.equal('error.model.item_must_contain_image');
        })
        .expect(404, done);
    });
  });
});

describe('GET /api/v1/seller/shops/:shopId/items/:itemId', () => {
  let  shop, sellerToken, item;

  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      sellerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({ ownerId: u.id}, 'dom A');
    }).then(s => {
      shop = s;
      return Category.findAll(); //we already have default category when doing migration
    }).then(cs => {
      return helper.factory.createItem({
        shopId: shop.id,
        categoryId: cs[0].id
      });
    }).then(i => {
      item = i;
      done();
    });
  });

  describe('with valid sellerToken and itemId', () => {
    it('should return 200 with item information', done => {

      request(app)
        .get(`/api/v1/seller/shops/${shop.id}/items/${item.id}`)
        .set('X-Access-Token', sellerToken)
        .expect(res => {
          let body = res.body;
          expect(body.id).to.equal(item.id);
          expect(body.name).to.equal(item.name);
          expect(body.description).to.equal(item.description);
          expect(body.image).to.equal(item.image);
          expect(body.quantity).to.equal(item.quantity);
        })
        .expect(200, done);
    });
  });

  describe('with valid sellerToken and invalid itemId', () => {
    it('should return 404 item does not exist', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop.id}/items/0`)
        .set('X-Access-Token', sellerToken)
        .expect(res => {
          let body = res.body;
          expect(body.status).to.equal(404);
          expect(body.message_code).to.equal('error.model.item_does_not_exist');
        })
        .expect(404, done);
    });
  });

  describe('with valid sellerToken and invalid shopId', () => {
    it('should return 404 item does not exist', done => {
      request(app)
        .get(`/api/v1/seller/shops/0/items/${item.id}`)
        .set('X-Access-Token', sellerToken)
        .expect(res => {
          let body = res.body;
          expect(body.status).to.equal(404);
          expect(body.message_code).to.equal('error.model.item_does_not_exist');
        })
        .expect(404, done);
    });
  });
});

describe('PUT /api/v1/seller/shops/:shopId/items/:itemId', () => {
  let  shop, sellerToken, categories, item;

  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      sellerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({ ownerId: u.id}, 'dom A');
    }).then(s => {
      shop = s;
      return Category.findAll(); //we already have default category when doing migration
    }).then(cs => {
      categories = cs;
      return helper.factory.createItem({
        shopId: shop.id,
        categoryId: cs[0].id
      });
    }).then(i => {
      item = i;
      done();
    });
  });

  describe('with invalid item', () => {
    it('should return 404', done => {
      request(app)
          .put(`/api/v1/seller/shops/${shop.id}/items/0`)
          .set('X-Access-Token', sellerToken)
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.message).to.equal('Item does not exist');
            expect(res.body.message_code).to.equal('error.model.item_does_not_exist');
          })
          .expect(404, done);
    });
  });

  describe('with invalid shop', () => {
    it('should return 404', done => {
      request(app)
          .put(`/api/v1/seller/shops/0/items/${item.id}`)
          .set('X-Access-Token', sellerToken)
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.message).to.equal('Shop does not exist');
            expect(res.body.message_code).to.equal('error.model.shop_does_not_exist');
          })
          .expect(404, done);
    });
  });

  describe('with valid item attribute and without image via multipart form', () => {
    it('should return 200 with new item information', done => {
      request(app)
        .put(`/api/v1/seller/shops/${shop.id}/items/${item.id}`)
        .set('X-Access-Token', sellerToken)
        .field('name', 'TRÀ THÁI XANH MIX THẠCH - KHÔNG THẠCH')
        .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
        .field('quantity', 300)
        .field('price', 15000)
        .field('status', Item.STATUS.FOR_SELL)
        .field('sort', 0)
        .field('categoryId', categories[1].id)
        .expect(res => {
          let body = res.body;
          expect(body.id).to.equal(item.id);
          expect(body.name).to.equal('TRÀ THÁI XANH MIX THẠCH - KHÔNG THẠCH');
          expect(body.description).to.equal('Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ');
          expect(body.image).to.equal(item.image);
        })
        .expect(200, done);
    });
  });

  describe('with 50 char item name via multipart form', () => {
    it('should return 200 with new item information', done => {
      request(app)
          .put(`/api/v1/seller/shops/${shop.id}/items/${item.id}`)
          .set('X-Access-Token', sellerToken)
          .attach('imageFile', 'test/fixtures/user-avatar.jpg')
          .field('name', 'Bun ca nhap khau nguyen chiec Hoa Ky An Do Hoa Lac')
          .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
          .field('quantity', 300)
          .field('price', 15000)
          .field('status', Item.STATUS.FOR_SELL)
          .field('sort', 0)
          .field('categoryId', categories[1].id)
          .expect(res => {
            let body = res.body;
            expect(body.id).to.equal(item.id);
            expect(body.name).to.equal('Bun ca nhap khau nguyen chiec Hoa Ky An Do Hoa Lac');
            expect(body.description).to.equal('Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ');
            expect(body.quantity).to.equal('300');
            expect(body.price).to.equal('15000');
            expect(body.status).to.equal(`${Item.STATUS.FOR_SELL}`);
            expect(body.sort).to.equal('0');
            expect(body.categoryId).to.equal(`${categories[1].id}`);
            expect(body.image).to.have.string(`/shops/${shop.id}/items/`);
            expect(body.image).to.not.equal(item.image);
          })
          .expect(200, done);
    });
  });

  describe('with 51 char item name via multipart form', () => {
    it('should return 200 with new item information', done => {
      request(app)
          .put(`/api/v1/seller/shops/${shop.id}/items/${item.id}`)
          .set('X-Access-Token', sellerToken)
          .attach('imageFile', 'test/fixtures/user-avatar.jpg')
          .field('name', 'Bun ca nhap khau nguyen chiec Hoa Ky An Do Hoa  Lac')
          .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
          .field('quantity', 300)
          .field('price', 15000)
          .field('status', Item.STATUS.FOR_SELL)
          .field('sort', 0)
          .field('categoryId', categories[1].id)
          .expect(res => {
            expect(res.body.status).to.equal(400);
            let errors = res.body.errors;
            expect(_.toPairs(errors)).to.have.lengthOf(1);
            expect(errors.name.message).to.equal('Length of name must be in [1, 50]');
            expect(errors.name.message_code).to.equal('error.form.validation_len_failed');
          })
          .expect(400, done);
    });
  });

  describe('with valid item attribute via multipart form', () => {
    it('should return 200 with new item information', done => {
      request(app)
        .put(`/api/v1/seller/shops/${shop.id}/items/${item.id}`)
        .set('X-Access-Token', sellerToken)
        .attach('imageFile', 'test/fixtures/user-avatar.jpg')
        .field('name', 'TRÀ THÁI XANH MIX THẠCH - KHÔNG THẠCH')
        .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
        .field('quantity', 300)
        .field('price', 15000)
        .field('status', Item.STATUS.FOR_SELL)
        .field('sort', 0)
        .field('categoryId', categories[1].id)
        .expect(res => {
          let body = res.body;
          expect(body.id).to.equal(item.id);
          expect(body.name).to.equal('TRÀ THÁI XANH MIX THẠCH - KHÔNG THẠCH');
          expect(body.description).to.equal('Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ');
          expect(body.quantity).to.equal('300');
          expect(body.price).to.equal('15000');
          expect(body.status).to.equal(`${Item.STATUS.FOR_SELL}`);
          expect(body.sort).to.equal('0');
          expect(body.categoryId).to.equal(`${categories[1].id}`);
          expect(body.image).to.have.string(`/shops/${shop.id}/items/`);
          expect(body.image).to.not.equal(item.image);
        })
        .expect(200, done);
    });
  });

  describe('with valid image file', () => {
    before(done => {
      request(app)
        .put(`/api/v1/seller/shops/${shop.id}/items/${item.id}`)
        .set('X-Access-Token', sellerToken)
        .attach('imageFile', 'test/fixtures/user-avatar.jpg')
        .end(() => {
          item.reload().then(() => done());
        });
    });

    it('should return 200 with new item information', done => {
      request(app)
        .put(`/api/v1/seller/shops/${shop.id}/items/${item.id}`)
        .set('X-Access-Token', sellerToken)
        .attach('imageFile', 'test/fixtures/user-avatar.jpg')
        .expect(200, done);
    });
  });

  describe('with some invalid fields in multipart form data', () => {
    it('should return 400 with message about invalid fields', done => {
      request(app)
        .put(`/api/v1/seller/shops/${shop.id}/items/${item.id}`)
        .set('X-Access-Token', sellerToken)
        .field('name', '')
        .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
        .field('quantity', 300)
        .field('price', 15000)
        .field('status', 9999999)
        .field('sort', 0)
        .field('categoryId', categories[1].id)
        .expect(res => {
          expect(res.body.status).to.equal(400);
          let errors = res.body.errors;
          expect(_.toPairs(errors)).to.have.lengthOf(2);
          expect(errors.name.message).to.equal('Length of name must be in [1, 50]');
          expect(errors.name.message_code).to.equal('error.form.validation_len_failed');
          expect(errors.status.message).to.equal('Provided status is not valid');
          expect(errors.status.message_code).to.equal('error.form.validation_data_failed');
        })
        .expect(400, done);
    });
  });

  describe('with some invalid foreign key fields in multipart form data', () => {
    it('should return 400 with message about invalid fields', done => {
      request(app)
        .put(`/api/v1/seller/shops/${shop.id}/items/${item.id}`)
        .set('X-Access-Token', sellerToken)
        .attach('imageFile', 'test/fixtures/user-avatar.jpg')
        .field('name', 'TRÀ THÁI XANH MIX THẠCH - KHÔNG THẠCH')
        .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
        .field('quantity', 300)
        .field('price', 15000)
        .field('status', Item.STATUS.FOR_SELL)
        .field('sort', 0)
        .field('categoryId', 0)
        .expect(res => {
          expect(res.body.status).to.equal(422);
          expect(res.body.message_code).to.equal('error.model.insert_or_update_on_table_items_violates_foreign_key_constraint_items_category_id_fkey');
        })
        .expect(422, done);
    });
  });

  describe('with invalid image file', () => {
    it('should return 400 with message about invalid image', done => {
      request(app)
        .post(`/api/v1/seller/shops/${shop.id}/items`)
        .set('X-Access-Token', sellerToken)
        .attach('imageFile', 'test/fixtures/invalid-image.txt')
        .field('name', 'TRÀ THÁI XANH MIX THẠCH - KHÔNG THẠCH')
        .field('description', 'Trà mình vừa mang lên, ngày nào cũng bán hết nên các cậu cứ yên tâm ạ')
        .field('quantity', 300)
        .field('price', 15000)
        .field('status', Item.STATUS.FOR_SELL)
        .field('sort', 0)
        .field('categoryId', categories[0].id)
        .expect(res => {
          expect(res.body.status).to.equal(400);
          let errors = res.body.errors;
          expect(_.toPairs(errors)).to.have.lengthOf(1);
          expect(errors.imageFile.message).to.equal('Only PNG and JPEG file is allowed');
          expect(errors.imageFile.message_code).to.equal('error.upload.invalid_image_format');
        })
        .expect(400, done);
    });
  });
});

describe('PUT /api/v1/seller/shops/:shopId/items/:itemId/setStatus', () => {
  let  shop, sellerToken, item;

  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      sellerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({ ownerId: u.id}, 'dom A');
    }).then(s => {
      shop = s;
      return Category.findAll(); //we already have default category when doing migration
    }).then(cs => {
      return helper.factory.createItem({
        shopId: shop.id,
        categoryId: cs[0].id
      });
    }).then(i => {
      item = i;
      done();
    });
  });

  describe('passed invalid status value', () => {
    it('should return 400', done => {
      request(app)
        .put(`/api/v1/seller/shops/${shop.id}/items/${item.id}/setStatus`)
        .set('X-Access-Token', sellerToken)
        .send({status: 999})
        .expect(400, done);
    });
  });

  describe('passed valid status value', () => {
    it('should change status of that item to new status', done => {
      request(app)
        .put(`/api/v1/seller/shops/${shop.id}/items/${item.id}/setStatus`)
        .set('X-Access-Token', sellerToken)
        .send({status: Item.STATUS.NOT_FOR_SELL})
        .expect(res => {
          let actualItem = res.body;
          expect(actualItem.id).to.equal(item.id);
          expect(actualItem.status).to.equal(Item.STATUS.NOT_FOR_SELL);
        })
        .expect(200, done);
    });
  });
});

describe('DELETE /api/v1/seller/shops/:shopId/items/:itemId', () => {
  let  shop, sellerToken, item;

  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      sellerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({ ownerId: u.id}, 'dom A');
    }).then(s => {
      shop = s;
      return Category.findAll(); //we already have default category when doing migration
    }).then(cs => {
      return helper.factory.createItem({
        shopId: shop.id,
        categoryId: cs[0].id
      });
    }).then(i => {
      item = i;
      done();
    });
  });

  describe('with valid shopId and itemId', () => {
    it('should return 200', done => {
      request(app)
        .delete(`/api/v1/seller/shops/${shop.id}/items/${item.id}`)
        .set('X-Access-Token', sellerToken)
        .expect(200, done);
    });
  });

  describe('with invalid item', () => {
    it('should return 404', done => {
      request(app)
          .delete(`/api/v1/seller/shops/${shop.id}/items/0`)
          .set('X-Access-Token', sellerToken)
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.message).to.equal('Item does not exist');
            expect(res.body.message_code).to.equal('error.model.item_does_not_exist');
          })
          .expect(404, done);
    });
  });

  describe('with invalid shop', () => {
    it('should return 404', done => {
      request(app)
          .delete(`/api/v1/seller/shops/0/items/${item.id}`)
          .set('X-Access-Token', sellerToken)
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.message).to.equal('Shop does not exist');
            expect(res.body.message_code).to.equal('error.model.shop_does_not_exist');
          })
          .expect(404, done);
    });
  });
});
