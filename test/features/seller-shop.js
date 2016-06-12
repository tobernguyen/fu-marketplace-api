'use strict';

const helper = require('../helper');
const request = require('supertest');
const app = require('../../app.js');
const Shop = require('../../models').Shop;
var _ = require('lodash');


describe('GET /api/v1/seller/shops/:id', () => {
  let  notOwnerToken, ownerToken, shop, buyerToken;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      notOwnerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      ownerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
    }).then(s => {
      shop = s;
      return helper.factory.createUser();
    }).then(u => {
      buyerToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });
  

  describe('with buyer token', () => {
    it('should return 403 Forbidden', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop.id}`)
        .set('X-Access-Token', buyerToken)
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.authentication.not_authorized');
        })
        .expect(403, done);  
    });
  });

  describe('with not owner access token', () => {
    it('should return 404 error', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop.id}`)
        .set('X-Access-Token', notOwnerToken)
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.error).to.equal('Shop does not exits');
          expect(res.body.message_code).to.equal('error.model.shop_does_not_exits');
        })
        .expect(404, done);  
    });
  });

  describe('with owner access token', () => {
    it('should return 200 OK and return new user profile', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop.id}`)
        .set('X-Access-Token', ownerToken)
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

});


describe('GET /api/v1/seller/shops/', () => {
  let  sellerHasShop, sellerDoNotHaveShop, shop, buyerToken;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      sellerDoNotHaveShop = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      sellerHasShop = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
    }).then(s => {
      shop = s;
      return helper.factory.createUser();
    }).then(u => {
      buyerToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });
  
  describe('with buyer token', () => {
    it('should return 403 Forbidden', done => {
      request(app)
        .get('/api/v1/seller/shops/')
        .set('X-Access-Token', buyerToken)
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.authentication.not_authorized');
        })
        .expect(403, done);  
    });
  });

  describe('with seller do not have shop access token', () => {
    it('should return 404 error', done => {
      request(app)
        .get('/api/v1/seller/shops/')
        .set('X-Access-Token', sellerDoNotHaveShop)
        .expect(res => {
          expect(res.body.shops).to.be.ok;
        })
        .expect(200, done);  
    });
  });

  describe('with seller has shops access token', () => {
    it('should return 200 OK and return an array which contain his/her shops info', done => {
      request(app)
        .get('/api/v1/seller/shops/')
        .set('X-Access-Token', sellerHasShop)
        .expect(res => {
          expect(res.body.shops).to.be.ok;
          let shops = res.body.shops.filter(function(e) {
            return e.id == shop.id;
          });
          expect(shops.length).to.equal(1);
          let s = shops[0];
          expect(s.name).to.equal(shop.name);
          expect(s.id).to.equal(shop.id);
          expect(s.ownerId).to.equal(shop.ownerId);
          expect(s.description).to.equal(shop.description);
          expect(s.avatar).to.equal(shop.avatar);
          expect(s.cover).to.equal(shop.cover);
          expect(s.shipPlaces.filter(function(e) {
            return e.name == 'dom A';
          }).length).to.equal(1);   
        })
        .expect(200, done);  
    });
  });
});

describe('PUT /api/v1/seller/shops/:id', () => {
  let  notOwnerToken, ownerToken, shop, normalUserToken, owner, bannedShop;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      notOwnerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      ownerToken = helper.createAccessTokenForUserId(u.id);
      owner = u;
      return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
    }).then(s => {
      shop = s;
      return helper.factory.createShopWithShipPlace({banned: true}, owner.id, 'dom A');
    }).then(s => {
      bannedShop = s;
      return helper.factory.createUser();
    }).then(u => {
      normalUserToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });

  describe('with normal user access token', () => {
    it('should return 403 Forbidden', done => {
      request(app)
        .put(`/api/v1/seller/shops/${shop.id}`)
        .set('X-Access-Token', normalUserToken)
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

  describe('with not owner access token', () => {
    it('should return 404 error', done => {
      request(app)
        .put(`/api/v1/seller/shops/${shop.id}`)
        .set('X-Access-Token', notOwnerToken)
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.error).to.equal('Shop does not exits');
          expect(res.body.message_code).to.equal('error.model.shop_does_not_exits');
        })
        .expect(404, done);  
    });
  });
  
  describe('with owner access token', () => {
    describe('with banned shop', () => {
      it('should return 404 error', done => {
        request(app)
          .put(`/api/v1/seller/shops/${bannedShop.id}`)
          .set('X-Access-Token', ownerToken)
          .set('Content-Type', 'application/json')
          .send({
            fullName: 'Nguyen Van A',
            banned: 'true',
            invalidattribute: 'invalid'
          })
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.error).to.equal('Cannot update info for banned shop');
            expect(res.body.message_code).to.equal('error.banned.cannot_update_info_for_banned_shop');
          })
          .expect(404, done);  
      });
    });

    describe('with not banned shop', () => {
      describe('valid input attribute', () => {
        it('should return 200 OK and return new shop infomation', done => {
          request(app)
            .put(`/api/v1/seller/shops/${shop.id}`)
            .set('X-Access-Token', ownerToken)
            .send({
              fullName: 'Nguyen Van A',
              banned: 'true',
              invalidattribute: 'invalid',
              opening: 'true',
              status: 0
            })
            .set('Content-Type', 'application/json')
            .expect(res => {
              expect(res.body.name).to.equal(shop.name);
              expect(res.body.description).to.equal(shop.description);
              expect(res.body.id).to.equal(shop.id);
              expect(res.body.avatar).to.equal(shop.avatar);
              expect(res.body.cover).to.equal(shop.cover);
              expect(res.body.ownerId).to.equal(owner.id);
              expect(res.body.banned).to.equal(null);
              expect(res.body.opening).to.equal(true);
              expect(res.body.status).to.equal('0');
              expect(res.body.invalidattribute).to.be.undefined;
            })
            .expect(200, done);  
        });
      }); 
      
      describe('with not defined status attribute', () => {
        it('should return 200 OK and return new shop infomation', done => {
          request(app)
            .put(`/api/v1/seller/shops/${shop.id}`)
            .set('X-Access-Token', ownerToken)
            .send({
              fullName: 'Nguyen Van A',
              banned: 'true',
              invalidattribute: 'invalid',
              opening: 'true',
              status: 99999999
            })
            .set('Content-Type', 'application/json')
            .expect(res => {
              expect(res.body.name).to.equal(shop.name);
              expect(res.body.description).to.equal(shop.description);
              expect(res.body.id).to.equal(shop.id);
              expect(res.body.avatar).to.equal(shop.avatar);
              expect(res.body.cover).to.equal(shop.cover);
              expect(res.body.ownerId).to.equal(owner.id);
              expect(res.body.banned).to.equal(null);
              expect(res.body.opening).to.equal(true);
              expect(res.body.status).to.equal(0);
              expect(res.body.invalidattribute).to.be.undefined;
            })
            .expect(200, done);  
        });
      }); 
      
      describe('invalid input attribute', () => {
        it('should return 422 and return errors in correct format', done => {
          request(app)
            .put(`/api/v1/seller/shops/${shop.id}`)
            .set('X-Access-Token', ownerToken)
            .send({
              name: '',
              description: ''
            })
            .set('Content-Type', 'application/json')
            .expect(res => {
              expect(res.body.status).to.equal(422);
              expect(res.body.errors.description).to.be.ok;
              expect(res.body.errors.description.message_code).to.equal('error.model.validation_len_failed');
            })
            .expect(422, done);
        });
      });
    });
  });
});

describe('POST /api/v1/seller/shops/:id/uploadAvatar', () => {
  let  sellerToken, shop, bannedShop, ownerId;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      ownerId = u.id;
      sellerToken = helper.createAccessTokenForUserId(ownerId);
      return helper.factory.createShopWithShipPlace({}, ownerId, 'dom A');
    }).then(s => {
      shop = s;
      return helper.factory.createShopWithShipPlace({banned: true}, ownerId, 'dom A');
    }).then(s => {
      bannedShop = s;
      done();
    });
  });
  
  describe('with valid access token and ', () => {
    describe('with banned shop', () => {
      it('should return 404 error', done => {
        request(app)
          .post(`/api/v1/seller/shops/${bannedShop.id}/uploadAvatar`)
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            fullName: 'Nguyen Van A',
            banned: 'true',
            invalidattribute: 'invalid'
          })
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.error).to.equal('Cannot update avatar for banned shop');
            expect(res.body.message_code).to.equal('error.banned.cannot_update_avatar_for_banned_shop');
          })
          .expect(404, done);  
      });
    });

    describe('with not banned shop', () => {
      describe('valid image file', () => {
        it('should return 200 and return user with valid avatar file', done => {
          request(app)
            .post(`/api/v1/seller/shops/${shop.id}/uploadAvatar`)
            .set('X-Access-Token', sellerToken)
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
            .post(`/api/v1/seller/shops/${shop.id}/uploadAvatar`)
            .set('X-Access-Token', sellerToken)
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
            .post(`/api/v1/seller/shops/${shop.id}/uploadAvatar`)
            .set('X-Access-Token', sellerToken)
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
});

describe('POST /api/v1/seller/shops/:id/uploadCover', () => {
  let  sellerToken, shop, bannedShop, ownerId;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      ownerId = u.id;
      sellerToken = helper.createAccessTokenForUserId(ownerId);
      return helper.factory.createShopWithShipPlace({}, ownerId, 'dom A');
    }).then(s => {
      shop = s;
      return helper.factory.createShopWithShipPlace({banned: true}, ownerId, 'dom A');
    }).then(s => {
      bannedShop = s;
      done();
    });
  });

  describe('with valid access token and ', () => {
    describe('with banned shop', () => {
      it('should return 404 error', done => {
        request(app)
          .post(`/api/v1/seller/shops/${bannedShop.id}/uploadCover`)
          .set('X-Access-Token', sellerToken)
          .set('Content-Type', 'application/json')
          .send({
            fullName: 'Nguyen Van A',
            banned: 'true',
            invalidattribute: 'invalid'
          })
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.error).to.equal('Cannot update cover for banned shop');
            expect(res.body.message_code).to.equal('error.banned.cannot_update_cover_for_banned_shop');
          })
          .expect(404, done);  
      });
    });

    describe('with not banned shop', () => {
      describe('valid image file', () => {
        it('should return 200 and return user with valid cover file', done => {
          request(app)
            .post(`/api/v1/seller/shops/${shop.id}/uploadCover`)
            .set('X-Access-Token', sellerToken)
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
            .post(`/api/v1/seller/shops/${shop.id}/uploadCover`)
            .set('X-Access-Token', sellerToken)
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
            .post(`/api/v1/seller/shops/${shop.id}/uploadCover`)
            .set('X-Access-Token', sellerToken)
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
});


describe('GET /api/v1/seller/shops/:id/shipPlaces', () => {
  let  notOwnerToken, ownerToken, shop, buyerToken;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      notOwnerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      ownerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
    }).then(s => {
      shop = s;
      return helper.factory.addShipPlaceToShop(s, 'dom B');
    }).then(s => {
      return helper.factory.createUser();
    }).then(u => {
      buyerToken = helper.createAccessTokenForUserId(u.id);
      done();
    });
  });
  

  describe('with buyer token', () => {
    it('should return 403 Forbidden', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop.id}/shipPlaces`)
        .set('X-Access-Token', buyerToken)
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.authentication.not_authorized');
        })
        .expect(403, done);  
    });
  });

  describe('with not owner access token', () => {
    it('should return 404 error', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop.id}/shipPlaces`)
        .set('X-Access-Token', notOwnerToken)
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.error).to.equal('Shop does not exits');
          expect(res.body.message_code).to.equal('error.model.shop_does_not_exits');
        })
        .expect(404, done);  
    });
  });

  describe('with owner access token', () => {
    it('should return 200 OK and return all shop\'s ship place', done => {
      request(app)
        .get(`/api/v1/seller/shops/${shop.id}/shipPlaces`)
        .set('X-Access-Token', ownerToken)
        .expect(res => {
          let shipPlaces = res.body.shipPlaces;
          expect(res.body.shipPlaces.filter(function(e) {
            return e.name == 'dom A';
          }).length).to.equal(1);
          expect(res.body.shipPlaces.filter(function(e) {
            return e.name == 'dom B';
          }).length).to.equal(1);
          expect(shipPlaces.length).to.equal(2);
        })
        .expect(200, done);  
    });
  });
});

describe('POST /api/v1/seller/shops/:id/shipPlaces', () => {
  let  notOwnerToken, ownerToken, shop, normalUserToken, owner, bannedShop, shipPlace;
  
  before(done => {
    helper.factory.createUserWithRole({}, 'seller').then(u => {
      notOwnerToken = helper.createAccessTokenForUserId(u.id);
      return helper.factory.createUserWithRole({}, 'seller');
    }).then(u => {
      ownerToken = helper.createAccessTokenForUserId(u.id);
      owner = u;
      return helper.factory.createShopWithShipPlace({}, u.id, 'dom A');
    }).then(s => {
      shop = s;
      return helper.factory.addShipPlaceToShop(s, 'dom B');
    }).then(s => {
      return helper.factory.createShopWithShipPlace({banned: true}, owner.id, 'dom A');
    }).then(s => {
      bannedShop = s;
      return helper.factory.createUser();
    }).then(u => {
      normalUserToken = helper.createAccessTokenForUserId(u.id);
      return shop.getShipPlaces();
    }).then(shipPlaces => {
      shipPlace = _.map(shipPlaces, sp => {
        return sp.id;
      });
      done();
    });
  });

  describe('with normal user access token', () => {
    it('should return 403 Forbidden', done => {
      request(app)
        .post(`/api/v1/seller/shops/${shop.id}/shipPlaces`)
        .set('X-Access-Token', normalUserToken)
        .send({
          shipPlaces: shipPlace
        })
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.status).to.equal(403);
          expect(res.body.message_code).to.equal('error.authentication.not_authorized');
        })
        .expect(403, done);  
    });
  });

  describe('with not owner access token', () => {
    it('should return 404 error', done => {
      request(app)
        .post(`/api/v1/seller/shops/${shop.id}/shipPlaces`)
        .set('X-Access-Token', notOwnerToken)
        .send({
          shipPlaces: shipPlace
        })
        .expect(res => {
          expect(res.body.status).to.equal(404);
          expect(res.body.error).to.equal('Shop does not exits');
          expect(res.body.message_code).to.equal('error.model.shop_does_not_exits');
        })
        .expect(404, done);  
    });
  });
  
  describe('with owner access token', () => {
    describe('with banned shop', () => {
      it('should return 404 error', done => {
        request(app)
          .post(`/api/v1/seller/shops/${bannedShop.id}/shipPlaces`)
          .set('X-Access-Token', ownerToken)
          .set('Content-Type', 'application/json')
          .send({
            shipPlaces: shipPlace
          })
          .expect(res => {
            expect(res.body.status).to.equal(404);
            expect(res.body.error).to.equal('Cannot update shipPlace for banned shop');
            expect(res.body.message_code).to.equal('error.banned.cannot_update_ship_place_for_banned_shop');
          })
          .expect(404, done);  
      });
    });

    describe('with not banned shop', () => {
      describe('valid ship places', () => {
        it('should return 200 OK and return new shop infomation', done => {
          request(app)
            .post(`/api/v1/seller/shops/${shop.id}/shipPlaces`)
            .set('X-Access-Token', ownerToken)
            .send({
              shipPlaces: _.take(shipPlace, 1)
            })
            .set('Content-Type', 'application/json')
            .expect(res => {
              expect(res.body.name).to.equal(shop.name);
              expect(res.body.description).to.equal(shop.description);
              expect(res.body.id).to.equal(shop.id);
              expect(res.body.avatar).to.equal(shop.avatar);
              expect(res.body.cover).to.equal(shop.cover);
              expect(res.body.ownerId).to.equal(owner.id);
              expect(res.body.banned).to.equal(null);
              expect(res.body.shipPlaces.filter(function(e) {
                return e.name == 'dom A';
              }).length).to.equal(1);   
              expect(res.body.shipPlaces.length).to.equal(1); 
            })
            .expect(200, done);  
        });
      }); 
    });
  });
  
  describe('invalid input attribute', () => {
    it('should return 422 and return errors in correct format', done => {
      request(app)
        .post(`/api/v1/seller/shops/${shop.id}/shipPlaces`)
        .set('X-Access-Token', ownerToken)
        .send({
          name: '',
          description: ''
        })
        .set('Content-Type', 'application/json')
        .expect(res => {
          expect(res.body.status).to.equal(422);
          expect(res.body.message_code).to.equal('error.param.must_provide_ship_places');
        })
        .expect(422, done);
    });
  });
});