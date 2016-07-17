'use strict';

const helper = require('../helper');
const Shop = require('../../models').Shop;
const Review = require('../../models').Review;
const Order = require('../../models').Order;
const rewire = require('rewire');
const _ = require('lodash');
const fs = require('fs-extra');
const moment = require('moment');
const tk = require('timekeeper');
const Promise = require('bluebird');

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

  describe('#review', () => {
    describe('with user did not order before', () => {
      let shop;
      beforeEach(done => {
        helper.factory.createShop().then(s => {
          shop = s;
          expect(shop).to.be.ok;
          done();
        });
      });

      it('should return error', done => {
        shop.review({
          userId: 0,
          rate: 3,
          comment: 'xxx'
        }).catch(err => {
          expect(err.status).to.equal(404);
          expect(err.type).to.equal('review');
          expect(err.message).to.equal('You must order at this shop at least one time');
          return Review.findAll({
            where: {
              userId: 0,
              shopId: shop.id
            }
          });
        }).then(reviews => {
          expect(reviews).to.have.lengthOf(0);
          done();
        }, done);
      });
    });

    describe('#updateAverageRating', () => {
      describe('shop does not have any review', () => {
        let shop;

        before(done => {
          helper.factory.createShop().then(s => {
            shop = s;
            done();
          });
        });

        it('should not update averageRating', done => {
          shop.updateAverageRating().then(shop => {
            expect(shop.averageRating).to.not.ok;
            done();
          });
        });
      });

      describe('shop have some reviews', () => {
        let shop, expectedAvg;

        before(done => {
          helper.factory.createShop().then(s => {
            shop = s;

            return helper.factory.createReviews(5, shop.id);
          }).then(reviews => {
            expectedAvg = _.reduce(reviews, (sum, n) => {
              return sum + n.rate;
            }, 0) / reviews.length;

            done();
          });
        });

        it('should calculate average rating and update to averageRating field of shop', done => {
          shop.updateAverageRating().then(shop => {
            expect(shop.averageRating).to.equal(expectedAvg);
            done();
          });
        });
      });
    });

    describe('with user ordered before', () => {
      let shop, order;
      beforeEach(done => {
        helper.factory.createShop().then(s => {
          shop = s;
          expect(shop).to.be.ok;
          return helper.factory.createOrder({ shopId: shop.id});
        }).then(o => {
          order = o;
          expect(o.shopId).to.equal(shop.id);

          helper.queue.testMode.clear();

          done();
        });
      });
      
      describe('provide userId attribute', () => {
        describe('provide rate and comment', () => {
          it('should return latest review', done => {
            let review;
            shop.review({
              userId: order.userId,
              rate: 3,
              comment: 'xxx'
            }).then(r => {
              review = r;
              expect(r.userId).to.equal(order.userId);
              expect(r.shopId).to.equal(shop.id);
              expect(r.rate).to.equal(3);
              expect(r.comment).to.equal('xxx');

              let jobs = helper.queue.testMode.jobs;
              expect(jobs).to.have.lengthOf(1);
              expect(jobs[0].type).to.equal('update shop average rating');
              expect(jobs[0].data).to.eql({shopId: shop.id});

              return shop.review({
                userId: order.userId,
                rate: 1,
                comment: 'yyy'
              });
            }).then(r => {
              expect(r.id).to.equal(review.id);
              expect(r.rate).to.equal(1);
              expect(r.comment).to.equal('yyy');
              done();
            }, done);
          });
        });

        describe('provide comment only', () => {
          it('should return err and review do not change', done => {
            let review;
            shop.review({
              userId: order.userId,
              rate: 3,
              comment: 'xxx'
            }).then(r => {
              review = r;
              expect(r.userId).to.equal(order.userId);
              expect(r.shopId).to.equal(shop.id);
              expect(r.rate).to.equal(3);
              expect(r.comment).to.equal('xxx');
              return shop.review({
                userId: order.userId,
                comment: 'yyy'
              });
            }).catch(err => {
              expect(err.status).to.equal(404);
              expect(err.message).to.equal('Must provide rate when review shop');
              expect(err.type).to.equal('review');
              return Review.findById(review.id);
            }).then(r => {
              expect(r.userId).to.equal(order.userId);
              expect(r.rate).to.equal(3);
              expect(r.comment).to.equal('xxx');
              expect(r.shopId).to.equal(shop.id);
              done();
            }, done);
          });
        });
      });

      describe('do not provide userId attribute', () => {
        it('should return err Must provide userId', done => {
          shop.review({
            rate: 3,
            comment: 'xxx'
          }).catch(err => {
            expect(err.status).to.equal(404);
            expect(err.message).to.equal('Must provide userId when review shop');
            expect(err.type).to.equal('review');
            done();
          }, done);
        });
      });
    });
  });

  describe('#getSalesStatistic', () => {
    let shop, orders = [];

    before(done => {
      helper.factory.createShop().then(s => {
        shop = s;

        let orderDates = _.map(_.rangeRight(8), dayAgo => moment().subtract(dayAgo, 'days').toDate());

        return Promise.each(orderDates, orderDate => {
          tk.freeze(orderDate);

          return helper.factory.createOrder({shopId: shop.id, status: Order.STATUS.COMPLETED}).then(order => {
            orders.push(order);
            return Promise.resolve();
          });
        }).then(() => {
          tk.reset();
          done();
        }).catch(err => {
          tk.reset();
          return Promise.reject(err);
        });
      }).catch(done);
    });

    it('should return sales statistic for most recent 7 days of the shop', done => {
      shop.getSalesStatistic().then(result => {
        expect(result).to.have.lengthOf(7); // There should be most recent 7 days only

        expect(result[0].year).to.equal(orders[1].createdAt.getFullYear());
        expect(result[0].month).to.equal(orders[1].createdAt.getMonth() + 1);
        expect(result[0].day).to.equal(orders[1].createdAt.getDate());

        expect(result[6].year).to.equal(orders[7].createdAt.getFullYear());
        expect(result[6].month).to.equal(orders[7].createdAt.getMonth() + 1);
        expect(result[6].day).to.equal(orders[7].createdAt.getDate());

        orders[1].getOrderLines().then(orderLines => {
          let expectedTotalSales = _.reduce(orderLines, (sum, ol) => sum + ol.item.price * ol.quantity, 0);
          expect(result[0].totalSales).to.equal(expectedTotalSales);

          return orders[7].getOrderLines();
        }).then(orderLines => {
          let expectedTotalSales = _.reduce(orderLines, (sum, ol) => sum + ol.item.price * ol.quantity, 0);
          expect(result[6].totalSales).to.equal(expectedTotalSales);

          done();
        });
      });
    });
  });

  describe('hooks', () => {
    describe('afterCreate', () => {
      let shop;

      beforeEach(done => {
        helper.factory.createShop({}, 1).then(s => {
          shop = s;
          done();
        });
      });

      it('should enqueue new job "update shop index"', done => {
        let jobs = helper.queue.testMode.jobs;
        expect(jobs).to.have.lengthOf(1);
        expect(jobs[0].type).to.equal('update shop index');
        expect(jobs[0].data).to.eql({shopId: shop.id});
        done();
      });
    });

    describe('afterUpdate', () => {
      let shop;

      beforeEach(done => {
        helper.factory.createShop({}, 1).then(s => {
          helper.queue.testMode.clear();
          shop = s;
          done();
        });
      });

      it('should enqueue new job "update shop index"', done => {
        shop.update({name: 'Updated name'}).then(_ => {
          let jobs = helper.queue.testMode.jobs;
          expect(jobs).to.have.lengthOf(1);
          expect(jobs[0].type).to.equal('update shop index');
          expect(jobs[0].data).to.eql({shopId: shop.id});
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
          helper.queue.testMode.clear();
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

      it('should enqueue new job "delete shop index"', done => {
        shop.destroy().then(() => {
          let jobs = helper.queue.testMode.jobs;
          expect(jobs).to.have.lengthOf(1);
          expect(jobs[0].type).to.equal('delete shop index');
          expect(jobs[0].data).to.eql({shopId: shop.id});
          done();
        });
      });
    });
  });
});
