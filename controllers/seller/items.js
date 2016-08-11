'use strict';

var _ = require('lodash');
var models = require('../../models');
var errorHandlers = require('../helpers/errorHandlers');
var processItemFormData = require('../../middlewares/processItemFormData');
var Item = models.Item;
var Shop = models.Shop;

const DEFAULT_PAGE_SIZE = 10;

exports.getItems = (req, res) => {
  let shopId = req.params.shopId;
  let size = _.toNumber(req.query.size);
  let page = _.toNumber(req.query.page);

  let perPage = size > 0 ? size : DEFAULT_PAGE_SIZE;
  let offset = page > 0 ? (page - 1) * perPage : 0;
  
  let seller = req.user;

  Shop.findOne({
    where: {
      id: shopId,
      ownerId: seller.id
    },
    include: [
      {
        model: Item,
        order: [
          'sort',
          'id'
        ],
        limit: perPage,
        offset: offset
      }
    ]
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
    
    let imageFileName = `shops/${shop.id}/items/${new Date().getTime()}`;

    processItemFormData({
      maxFileSize: Item.MAX_IMAGE_SIZE,
      versions: [
        {
          resize: '200x200',
          crop: '200x200',
          quality: 90,
          suffix: 'small',
          fileName: imageFileName
        },
        {
          resize: '960x960',
          quality: 90,
          fileName: imageFileName
        }
      ]
    })(req, res, d => {
      let validatedData = req.form;
      if (!validatedData.image) {
        let error = 'Item must contain image';
        errorHandlers.responseError(422, error, 'model', res);
        return;
      }

      let newItemData = _.cloneDeep(validatedData);
      newItemData.image = `${validatedData.image[0].Location}?${new Date().getTime()}`;
      newItemData.imageFile = {
        versions: _.map(validatedData.image, image => {
          return {
            Url: image.Location,
            Key: image.Key
          };
        })
      };

      newItemData.shopId = shop.id;
      Item.create(newItemData).then(item => {
        res.json(item);
      });
    });
  });
};

exports.getItem = (req, res) => {
  let shopId = req.params.shopId;
  let itemId = req.params.itemId;
  let seller = req.user;

  Item.findOne({
    where: {
      id: itemId,
      shopId: shopId
    },
    include: {
      model: Shop,
      where: {
        ownerId: seller.id
      }
    }
  }).then(item => {
    if (!item) {
      let error ='Item does not exist';
      errorHandlers.responseError(404, error, 'model', res);
      return;
    }

    res.json(item);
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
    include: [
      {
        model: Item,
        where: {
          id: itemId
        },
        required: false
      }
    ],
    order:[
      'sort',
      'id'
    ]
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

    // Get old file name to replace that file
    let imageFileName = _.get(item, 'imageFile.versions[1].Key') ||
                        `shops/${shop.id}/items/${new Date().getTime()}`;

    processItemFormData({
      maxFileSize: Item.MAX_IMAGE_SIZE,
      versions: [
        {
          resize: '200x200',
          crop: '200x200',
          quality: 90,
          suffix: 'small',
          fileName: imageFileName
        },
        {
          resize: '960x960',
          quality: 90,
          fileName: imageFileName
        }
      ]
    })(req, res, d => {
      let data = req.form;
      let promises = [];
      let updateData = _.cloneDeep(data);
      if (data.image !== undefined) {
        updateData.image = `${data.image[0].Location}?${new Date().getTime()}`;
        updateData.imageFile = {
          versions: _.map(data.image, image => {
            return {
              Url: image.Location,
              Key: image.Key  
            };
          })
        };
      } 

      let returnItem;

      promises[promises.length] = item.update(updateData).then(item => {
        returnItem = item;
        return Promise.resolve();
      });
      Promise.all(promises).then(item => {
        res.json(returnItem);
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
      },
      required: false
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

exports.putSetItemStatus = (req, res) => {
  let status = req.body.status;
  let shopId = req.params.shopId;
  let itemId = req.params.itemId;
  let seller = req.user;

  if (!_.includes(_.values(Item.STATUS), status) || !shopId || !itemId) {
    errorHandlers.responseError(400, 'Invalid request', 'request', res);
    return;
  }

  Shop.findOne({
    where: {
      id: shopId,
      ownerId: seller.id
    },
    include: {
      model: Item,
      where: {
        id: itemId
      },
      required: false
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
    item.update({
      status: status
    }).then(item => {
      res.json(item);
    });
  });
};
