'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const Shop = require('../../models').Shop;


describe('GET /api/v1/admin/shops/:id', () => {
  let  adminToken, shop;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUser();
    }).then(u => {
      return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
    }).then(s => {
      shop = s;
      done();
    });
  });
  
  describe('with exits shop', () => {
    it('should return 200 OK and return new user profile', done => {
      request(app)
        .get(`/api/v1/admin/shops/${shop.id}`)
        .set('X-Access-Token', adminToken)
        .expect(res => {
          expect(res.body.name).to.equal(shop.name);
          expect(res.body.id).to.equal(shop.id);
          expect(res.body.ownerId).to.equal(shop.ownerId);
          expect(res.body.description).to.equal(shop.description);
          expect(res.body.avatar).to.equal(shop.avatar);
          expect(res.body.cover).to.equal(shop.cover);
          expect(res.body.shipPlaces.filter(function(e) {
            return e.name == 'dom A';
          }).length).to.equal(1);
        })
        .expect(200, done);  
    });
  });
  
  describe('with non-exits shop', () => {
    it('should return 404 error', done => {
      request(app)
        .get('/api/v1/admin/shops/0')
        .set('X-Access-Token', adminToken)
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.error).to.equal('Shop does not exits');
          expect(res.body.message_code).to.equal('error.model.shop_does_not_exits');
        })
        .expect(404, done);  
    });
  });
});

describe('GET /api/v1/admin/shops/', () => {
  let adminToken, normalUserAccessToken, createdShop;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUser();
    }).then(u => {
      normalUserAccessToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
    }).then(s => {
      createdShop = s;
      done();
    });
  });
  
  describe('with admin access token', () => {
    it('should return 200 OK and return an array which contain created shop info', done => {
      request(app)
        .get('/api/v1/admin/shops/')
        .set('X-Access-Token', adminToken)
        .expect(res => {
          expect(res.body.shops).to.be.ok;
          let shops = res.body.shops.filter(function(e) {
            return e.id == createdShop.id;
          });
          expect(shops.length).to.equal(1);
          let shop = shops[0];
          expect(shop.name).to.equal(createdShop.name);
          expect(shop.id).to.equal(createdShop.id);
          expect(shop.ownerId).to.equal(createdShop.ownerId);
          expect(shop.description).to.equal(createdShop.description);
          expect(shop.avatar).to.equal(createdShop.avatar);
          expect(shop.cover).to.equal(createdShop.cover);
          expect(shop.shipPlaces.filter(function(e) {
            return e.name == 'dom A';
          }).length).to.equal(1);   
        })
        .expect(200, done);  
    });
  });
  
  describe('with normal user access token', () => {
    it('should return 403 Forbidden', done => {
      request(app)
        .get('/api/v1/admin/shops/')
        .set('X-Access-Token', normalUserAccessToken)
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.authentication.not_authorized');
        })
        .expect(403, done);  
    });
  });
});

describe('PUT /api/v1/admin/shops/:id', () => {
  let adminToken, normalUserAccessToken, seller, shop;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      seller = u;
      normalUserAccessToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
    }).then(s => {
      shop = s;
      done();
    });
  });
  
  describe('with admin access token', () => {
    describe('valid input attribute', () => {
      it('should return 200 OK and return new shop infomation', done => {
        request(app)
          .put(`/api/v1/admin/shops/${shop.id}`)
          .set('X-Access-Token', adminToken)
          .send({
            fullName: 'Nguyen Van A',
            banned: 'true',
            invalidattribute: 'invalid'
          })
          .set('Content-Type', 'application/json')
          .expect(res => {
            expect(res.body.name).to.equal(shop.name);
            expect(res.body.description).to.equal(shop.description);
            expect(res.body.id).to.equal(shop.id);
            expect(res.body.avatar).to.equal(shop.avatar);
            expect(res.body.cover).to.equal(shop.cover);
            expect(res.body.ownerId).to.equal(seller.id);
            expect(res.body.banned).to.equal(true);
            expect(res.body.invalidattribute).to.be.undefined;
          })
          .expect(200, done);  
      });
    }); 
    
    describe('invalid ownerID attribute', () => {
      it('should return 500 invalid foreign key', done => {
        request(app)
          .put(`/api/v1/admin/shops/${shop.id}`)
          .set('X-Access-Token', adminToken)
          .send({
            ownerId: 0
          })
          .set('Content-Type', 'application/json')
          .expect(res => {
            expect(res.body.status).to.equal(500);  
            expect(res.body.message_code).to.equal('error.model.insert_or_update_on_table_shops_violates_foreign_key_constraint_shops_owner_id_fkey');
          })
          .expect(500, done);  
      });
    }); 
    
    describe('invalid input attribute', () => {
      it('should return 422 and return errors in correct format', done => {
        request(app)
          .put(`/api/v1/admin/shops/${shop.id}`)
          .set('X-Access-Token', adminToken)
          .send({
            name: '',
            description: ''
          })
          .set('Content-Type', 'application/json')
          .expect(res => {
            expect(res.body.status).to.equal(422);
            expect(res.body.errors.name).to.be.ok;
            expect(res.body.errors.name.message_code).to.equal('error.model.validation_len_failed');
            expect(res.body.errors.description).to.be.ok;
            expect(res.body.errors.description.message_code).to.equal('error.model.validation_len_failed');
          })
          .expect(422, done);
      });
    });
  });
  
  describe('with normal user access token', () => {
    it('should return 403 Forbidden', done => {
      request(app)
        .put(`/api/v1/admin/shops/${shop.id}`)
        .set('X-Access-Token', normalUserAccessToken)
        .send({
          fullName: 'XXXXXXXXXXXX'
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

describe('POST /api/v1/admin/shops/:id/uploadAvatar', () => {
  let  adminToken, shop;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUser();
    }).then(u => {
      return helper.factory.createShopWithShipPlace({}, u.id, 'Dom A');
    }).then(s => {
      shop = s;
      done();
    });
  });
  
  describe('with valid access token and ', () => {
    describe('valid image file', () => {
      it('should return 200 and return user with valid avatar file', done => {
        request(app)
          .post(`/api/v1/admin/shops/${shop.id}/uploadAvatar`)
          .set('X-Access-Token', adminToken)
          .attach('file', 'test/fixtures/user-avatar.jpg')
          .expect(res => {
            expect(res.body.id).to.equal(shop.id);
            expect(res.body.avatar).to.have.string(`shops/${shop.id}/avatar.jpg`);
          })
          .expect(200, done);  
      });
    });
    
    describe('invalid image file', () => {
      it('should return 422 and inform client file is invalid', done => {
        request(app)
          .post(`/api/v1/admin/shops/${shop.id}/uploadAvatar`)
          .set('X-Access-Token', adminToken)
          .attach('file', 'test/fixtures/invalid-image.txt')
          .expect(res => {
            expect(res.body.status).to.equal(422);
            expect(res.body.message).to.equal('Only PNG and JPEG file is allowed');
          })
          .expect(422, done);
      });
    });
    
    describe('image file is too big', () => {
      let originalMaximumAvatarSize;
      
      before(() => {
        originalMaximumAvatarSize = Shop.MAXIMUM_AVATAR_SIZE;
        Shop.MAXIMUM_AVATAR_SIZE = 1024; // Allow 1KB file only
      });
      
      after(() => {
        Shop.MAXIMUM_AVATAR_SIZE = originalMaximumAvatarSize;
      });
      
      it('should return 406 and inform client file is too big', done => {
        request(app)
          .post(`/api/v1/admin/shops/${shop.id}/uploadAvatar`)
          .set('X-Access-Token', adminToken)
          .attach('file', 'test/fixtures/user-avatar.jpg')
          .expect(res => {
            expect(res.body.status).to.equal(406);
            expect(res.body.message).to.equal('File is too big. Maximum file size allow: 1KB');
          })
          .expect(406, done);
      });
    }); 
  });
});

describe('POST /api/v1/admin/shops/:id/uploadCover', () => {
  let  adminToken, shop;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'admin').then(u => {
      adminToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUser();
    }).then(u => {
      return helper.factory.createShopWithShipPlace({}, u.id, 'Dom A');
    }).then(s => {
      shop = s;
      done();
    });
  });
  
  describe('with valid access token and ', () => {
    describe('valid image file', () => {
      it('should return 200 and return user with valid cover file', done => {
        request(app)
          .post(`/api/v1/admin/shops/${shop.id}/uploadCover`)
          .set('X-Access-Token', adminToken)
          .attach('file', 'test/fixtures/user-avatar.jpg')
          .expect(res => {
            expect(res.body.id).to.equal(shop.id);
            expect(res.body.cover).to.have.string(`shops/${shop.id}/cover.jpg`);
          })
          .expect(200, done);  
      });
    });
    
    describe('invalid image file', () => {
      it('should return 422 and inform client file is invalid', done => {
        request(app)
          .post(`/api/v1/admin/shops/${shop.id}/uploadCover`)
          .set('X-Access-Token', adminToken)
          .attach('file', 'test/fixtures/invalid-image.txt')
          .expect(res => {
            expect(res.body.status).to.equal(422);
            expect(res.body.message).to.equal('Only PNG and JPEG file is allowed');
          })
          .expect(422, done);
      });
    });
    
    describe('image file is too big', () => {
      let originalMaximumCoverSize;
      
      before(() => {
        originalMaximumCoverSize = Shop.MAXIMUM_COVER_SIZE;
        Shop.MAXIMUM_COVER_SIZE = 1024; // Allow 1KB file only
      });
      
      after(() => {
        Shop.MAXIMUM_COVER_SIZE = originalMaximumCoverSize;
      });
      
      it('should return 406 and inform client file is too big', done => {
        request(app)
          .post(`/api/v1/admin/shops/${shop.id}/uploadCover`)
          .set('X-Access-Token', adminToken)
          .attach('file', 'test/fixtures/user-avatar.jpg')
          .expect(res => {
            expect(res.body.status).to.equal(406);
            expect(res.body.message).to.equal('File is too big. Maximum file size allow: 1KB');
          })
          .expect(406, done);
      });
    }); 
  });
});