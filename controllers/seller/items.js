'use strict';

var _ = require('lodash');
var models = require('../../models');
var errorHandlers = require('../helpers/errorHandlers');
var processItemFormData = require('../../middlewares/processItemFormData');
var Item = models.Item;
var Shop = models.Shop;
var imageUploader = require('../../libs/image-uploader');

exports.getItems = (req, res) => {
  let shopId = req.params.shopId;
  
  let seller = req.user;

  Shop.findOne({
    where: {
      id: shopId,
      ownerId: seller.id
    },
    include: Item
  }).then((shop) => {
    if (!shop) {
      let error = 'Shop does not exist';
      errorHandlers.responseError(404, error, 'model', res);
      return;
    }

    let items = _.map(shop.Items, item => item.toJSON());
    res.json({
      items: items
    });  
  });
};

exports.postItems = (req, res) => {
  let shopId = req.params.shopId;
  let seller = req.user;

  Shop.findOne({
    where: {
      id: shopId,
      ownerId: seller.id
    }
  }).then(shop => {
    if (!shop) {
      let error ='Shop does not exist';
      errorHandlers.responseError(404, error, 'model', res);
      return;
    }
    
    let imageFileName = new Date().getTime();

    processItemFormData({
      maxFileSize: Item.MAX_IMAGE_SIZE,
      versions: [
        {
          resize: '200x200',
          crop: '200x200',
          quality: 90,
          suffix: 'small',
          fileName: `/shops/${shop.id}/items/${imageFileName}`
        },
        {
          resize: '960x960',
          quality: 90,
          fileName: `/shops/${shop.id}/items/${imageFileName}`
        }
      ]
    })(req, res, d => {
      let data = req.form;
      if (!data.image) {
        let error = 'Item must contain image';
        errorHandlers.responseError(404, error, 'model', res);
        return;
      }
      Item.create({
        image: data.image[0].Location, // Save the url of first image version to avatar field
        imageFile: {
          versions: _.map(data.image, image => {
            return {
              Url: image.Location,
              Key: image.Key
            };
          })
        },
        name: data.name,
        description: data.description,
        sort: data.sort,
        price: data.price,
        status: data.status,
        quantity: data.quantity,
        categoryId: data.categoryId,
        shopId: shop.id
      }).then(item => {
        res.json(item);
      });
    });
  });
};

exports.putItem = (req, res) => {
  let shopId = req.params.shopId;
  let itemId = req.params.itemId;
  let seller = req.user;

  Shop.findOne({
    where: {
      id: shopId,
      ownerId: seller.id
    },
    include: {
      model: Item,
      where: {
        id: itemId
      }
    }
  }).then(shop => {
    if (!shop) {
      let error ='Shop does not exist';
      errorHandlers.responseError(404, error, 'model', res);
      return;
    }

    if (shop.Items.length == 0) {
      let error ='Item does not exist';
      errorHandlers.responseError(404, error, 'model', res);
      return;
    }

    let item = shop.Items[0];
    
    let imageFileName = new Date().getTime();

    processItemFormData({
      maxFileSize: Item.MAX_IMAGE_SIZE,
      versions: [
        {
          resize: '200x200',
          crop: '200x200',
          quality: 90,
          suffix: 'small',
          fileName: `/shops/${shop.id}/items/${imageFileName}`
        },
        {
          resize: '960x960',
          quality: 90,
          fileName: `/shops/${shop.id}/items/${imageFileName}`
        }
      ]
    })(req, res, d => {
      let data = req.form;
      let dataUpdate = {};
      if (data.image !== undefined) {
        if (item.imageFile && _.isArray(item.imageFile.versions)) {
          imageUploader.deleteImages(item.imageFile.versions).then(() => {
            
          });
        }
        dataUpdate.image = data.image[0].Location;
        dataUpdate.imageFile = {
          versions: _.map(data.image, image => {
            return {
              Url: image.Location,
              Key: image.Key  
            };
          })
        };
        delete data.image;
      } 

      _.forIn(data, function(value, key) {
        dataUpdate[key] = value;
      });

      item.update(dataUpdate).then(item => {
        res.json(item);
      }).catch(err => {
        errorHandlers.handleModelError(err, res);
      });
    });
  });
};

exports.deleteItem = (req, res) => {
  let shopId = req.params.shopId;
  let itemId = req.params.itemId;
  let seller = req.user;

  Shop.findOne({
    where: {
      id: shopId,
      ownerId: seller.id
    },
    include: {
      model: Item,
      where: {
        id: itemId
      }
    }
  }).then(shop => {
    if (!shop) {
      let error ='Shop does not exist';
      errorHandlers.responseError(404, error, 'model', res);
      return;
    }

    if (shop.Items.length == 0) {
      let error ='Item does not exist';
      errorHandlers.responseError(404, error, 'model', res);
      return;
    }

    let item = shop.Items[0];
    
    item.destroy().then(() => {
      res.sendStatus(200);
    });
  });
};
