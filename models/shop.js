'use strict';

const imageUploader = require('../libs/image-uploader');
const _ = require('lodash');
const kue = require('../libs/kue');
const socketio = require('../libs/socket-io');

var SHOP_STATUS = {
  PUBLISHED: 1,
  UNPUBLISHED: 0
};

var IGNORE_ATTRIBUTES = [
  'updatedAt',
  'createdAt',
  'avatarFile',
  'coverFile'
];

module.exports = function(sequelize, DataTypes) {
  let Shop = sequelize.define('Shop', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    avatar: {
      type: DataTypes.STRING
    },
    cover: {
      type: DataTypes.STRING
    },
    opening: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    avatarFile: {
      type: DataTypes.JSON
    },
    coverFile: {
      type: DataTypes.JSON
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    banned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    address: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0 // UNPUBLISHED
    },
    averageRating: {
      type: DataTypes.FLOAT(2)
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    hooks: {
      afterCreate: function(shop, options) {
        kue.createUpdateShopIndexJob({shopId: shop.id});
      },
      afterUpdate: function(shop, options) {
        kue.createUpdateShopIndexJob({shopId: shop.id});

        // TODO: add tests
        // Push real-time notification changes
        let updatedKeys = [];

        _.keys(shop['_changed']).forEach(k => {
          if (shop['_changed'][k] === true) updatedKeys[updatedKeys.length] = k;
        });

        let pushData = _.pick(shop, ['id'].concat(updatedKeys));
        socketio.pushToPublicChannel(socketio.EVENT.SHOP_FEED_UPDATE, pushData);
      },
      afterDestroy: function(shop, options) {
        kue.createDeleteShopIndexJob({shopId: shop.id});

        var promises = [];
        
        // Delete shop's avatar files
        if (shop.avatarFile && _.isArray(shop.avatarFile.versions)) {
          promises.push(imageUploader.deleteImages(shop.avatarFile.versions));
        }
        
        // Delete shop's cover files
        if (shop.coverFile && _.isArray(shop.coverFile.versions)) {
          promises.push(imageUploader.deleteImages(shop.coverFile.versions));
        }

        if (promises.length) {
          return Promise.all(promises);
        }
      }
    },
    classMethods: {
      associate: function(models) {
        Shop.belongsToMany(models.ShipPlace, {through: 'ShopShipPlaces'});
        Shop.belongsTo(models.User, {
          foreignKey: 'ownerId'
        });
        Shop.hasMany(models.Item, {
          foreignKey: 'shopId',
          constraints: false
        });
        Shop.hasMany(models.Order, {
          foreignKey: 'shopId',
          constraints: false
        });
        Shop.hasMany(models.Review, {
          foreignKey: 'shopId',
          constraints: false
        });
        Shop.hasMany(models.ShopPromotionCampaign, {
          foreignKey: 'shopId',
          constraints: false
        });
      }
    },
    instanceMethods: {
      toJSON: function () {
        var values = this.get();
        
        IGNORE_ATTRIBUTES.forEach(attr => {
          delete values[attr];
        });
        
        return values;
      },
      placeOrder: function(params) {
        let user = params.user;
        let reqBody = params.reqBody;
        if (!reqBody.note) reqBody.note = '';

        let order, items;
        
        return sequelize.transaction(t => {
          let itemIds = _.map(reqBody.items, item => item.id);
          return this.getItems({
            where: {
              id: {
                $in: itemIds
              },
              status: sequelize.model('Item').STATUS.FOR_SELL
            },
            transaction: t
          }).then(its => {
            if (its.length == 0) {
              return Promise.reject({ message: 'Item not found', type: 'order', status: 403});
            } else {
              items = its;
              return sequelize.model('Order').create({
                userId: user.id,
                shopId: this.id,
                note: reqBody.note,
                shipAddress: reqBody.shipAddress
              }, {transaction: t});
            }
          }).then(o => {
            order = o;
            let orderLineData = _.map(items, i => {
              let orderLine = getQuantityAndNoteOfItem(reqBody.items, i.id);
              orderLine.item = _.pick(i, ['id', 'name', 'description', 'price', 'categoryId']);
              orderLine.orderId = order.id;
              return orderLine;
            });
            return sequelize.model('OrderLine').bulkCreate(orderLineData, {validate: true, transaction: t});
          });
        }).then(() => {
          let UserNotification = sequelize.model('UserNotification');

          // Create notification to inform seller there is new order
          kue.createSendOrderNotificationToSellerJob({orderId: order.id, notificationType: UserNotification.NOTIFICATION_TYPE.USER_PLACE_ORDER});
          return Promise.resolve(order);
        }).catch(err =>  {
          return Promise.reject(err);
        });
      },
      setShipPlacesThenUpdateIndex: function(shipPlaces) {
        let setShipPlacesResult;
        return this.setShipPlaces(shipPlaces).then(s => {
          setShipPlacesResult = s;

          // TODO: add test
          // Push real-time notification changes
          socketio.pushToPublicChannel(socketio.EVENT.SHOP_FEED_UPDATE, {
            id: this.id,
            shipPlaceIds: _.map(shipPlaces, sp => sp.id)
          });

          // Re-index this shop
          this.reindex();

          return Promise.resolve(setShipPlacesResult);
        });
      },
      reindex: function() {
        kue.createUpdateShopIndexJob({shopId: this.id});
      },
      review: function (rateInfo) {
        return new Promise((resolve, reject) => {
          let userId = rateInfo.userId;
          let reviewInfo = _.pick(rateInfo, ['rate', 'comment']);

          if (!userId && userId!==0) {
            let error = 'Must provide userId when review shop';
            reject({
              status: 404,
              message: error,
              type: 'review'
            });
          }

          if (!reviewInfo.comment) {
            reviewInfo.comment = '';
          }

          if (!reviewInfo.rate) {
            let error = 'Must provide rate when review shop';
            reject({
              status: 404,
              message: error,
              type: 'review'
            });
          }

          sequelize.transaction(t => {
            return sequelize.model('Order').findOne({
              where: {
                shopId: this.id,
                userId: userId
              },
              transaction: t
            }).then(order => {
              if (!order) {
                let error = 'You must order at this shop at least one time';
                return Promise.reject({
                  status: 404,
                  message: error,
                  type: 'review'
                });
              } else {
                return sequelize.model('Review').findOrBuild({
                  where: {
                    shopId: this.id,
                    userId: userId
                  },
                  transaction: t
                }).spread(review => {
                  review.set('rate', reviewInfo.rate);
                  review.set('comment', reviewInfo.comment);
                  return review.save({transaction: t});
                });
              }
            });
          }).then(review => {
            // Create background job to update average rating
            // of current shop then re-index the shop to elasticsearch
            kue.createUpdateShopReviewAvgJob({shopId: this.id});

            resolve(review);
          }).catch(reject);
        });
      },
      updateAverageRating: function() {
        return sequelize.query(
          `SELECT avg("Reviews"."rate")::float4 AS average_rating FROM public."Reviews" WHERE "Reviews"."shopId" = ${this.id};`,
          { type: sequelize.QueryTypes.SELECT}
        ).then(result => {
          let averageRating = result[0]['average_rating'];

          if (!averageRating) return Promise.resolve(this); // Short circuit if there is no review

          return this.update({
            averageRating: averageRating
          });
        });
      },
      getSalesStatistic: function() {
        let sql = `SET TIME ZONE 'Asia/Bangkok';
                  SELECT 
                    date_part('year', "Orders"."createdAt") as "year",
                    date_part('month', "Orders"."createdAt") as "month",
                    date_part('day', "Orders"."createdAt") as "day",
                    sum(jsonb_extract_path_text("OrderLines"."item", 'price')::integer * "OrderLines"."quantity")::integer as "totalSales"
                  FROM 
                    public."Orders", 
                    public."OrderLines"
                  WHERE 
                    "OrderLines"."orderId" = "Orders".id AND
                    "Orders"."shopId" = :shopId AND 
                    "Orders".status = :status AND
                    "Orders"."createdAt" > current_date - interval '6 days'
                  GROUP BY "year", "month", "day"
                  ORDER BY "year", "month", "day";`;
        return sequelize.query(sql, {
          replacements: {
            shopId: this.id,
            status: sequelize.model('Order').STATUS.COMPLETED
          },
          type: sequelize.QueryTypes.SELECT
        });
      },
      getOrdersStatistic: function() {
        let sql = `SET TIME ZONE 'Asia/Bangkok';
                  WITH tmp_tbl AS (SELECT 
                      "createdAt",
                      CASE WHEN status=:status THEN 1
                     ELSE 0
                      END as "CompletedOrders",
                      CASE WHEN status!=:status THEN 1
                     ELSE 0
                      END as "InCompletedOrders"
                    FROM 
                      public."Orders"
                    WHERE 
                      "shopId" = :shopId AND
                      "createdAt" > current_date - interval '6 days'
                    ORDER BY "createdAt")
                  
                    SELECT 
                    date_part('year', "createdAt") as "year",
                    date_part('month', "createdAt") as "month",
                    date_part('day', "createdAt") as "day",
                    sum("CompletedOrders")::integer as "completedOrders",
                    sum("InCompletedOrders")::integer as "incompleteOrders"
                    FROM tmp_tbl
                    GROUP BY "year", "month", "day"
                    ORDER BY "year", "month", "day";`;
        return sequelize.query(sql, {
          replacements: {
            shopId: this.id,
            status: sequelize.model('Order').STATUS.COMPLETED
          },
          type: sequelize.QueryTypes.SELECT
        });
      },
      getItemSoldStatistic: function() {
        let sql = `SET TIME ZONE 'Asia/Bangkok';
                  SELECT 
                    date_part('year', "Orders"."createdAt") as "year",
                    date_part('month', "Orders"."createdAt") as "month",
                    date_part('day', "Orders"."createdAt") as "day",
                    jsonb_extract_path_text("OrderLines"."item", 'categoryId')::integer as "categoryId",
                    count("OrderLines".id)::integer as "itemSold"
                  FROM 
                    public."Orders", 
                    public."OrderLines"
                  WHERE 
                    "OrderLines"."orderId" = "Orders".id AND
                    "Orders"."shopId" = :shopId AND 
                    "Orders".status = :status AND
                    "Orders"."createdAt" > current_date - interval '6 days'
                  GROUP BY "year", "month", "day", "categoryId"
                  ORDER BY "year", "month", "day";`;
        return sequelize.query(sql, {
          replacements: {
            shopId: this.id,
            status: sequelize.model('Order').STATUS.COMPLETED
          },
          type: sequelize.QueryTypes.SELECT
        }).then(rawResult => {
          let result = {};
          _.each(rawResult, r => {
            if (result[`${r.year}${r.month}${r.day}`] === undefined) {
              result[`${r.year}${r.month}${r.day}`] = _.pick(r, ['year', 'month', 'day']);
              result[`${r.year}${r.month}${r.day}`]['itemSold'] = {};
            }
            result[`${r.year}${r.month}${r.day}`]['itemSold'][r.categoryId] = r.itemSold;
          });

          let sortedResult = _.sortBy(_.toArray(result), ['year', 'month', 'day']);

          return Promise.resolve(sortedResult);
        });
      }
    }
  });
  
  Shop.MAXIMUM_AVATAR_SIZE = 3 * 1024 * 1024; // 3MB
  Shop.MAXIMUM_COVER_SIZE = 3 * 1024 * 1024; // 3MB
  Shop.STATUS = SHOP_STATUS;
  
  var getQuantityAndNoteOfItem = (reqBody, id) => {
    let reqItem = _.filter(reqBody, ['id', id])[0];
    if (reqItem.quantity == 0){
      reqItem.quantity = sequelize.model('OrderLine').DEFAULT_QUANTITY;
    }
    delete reqItem.id;
    return reqItem;
  };

  return Shop;
};
