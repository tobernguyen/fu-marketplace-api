'use strict';

var multiparty = require('multiparty');
var gm = require('gm');
var _ = require('lodash');
var Promise = require('bluebird');
var logger = require('../libs/logger');
var imageUploader = require('../libs/image-uploader');
var storeImageFromStream = imageUploader.storeImageFromStream;
var deleteImages = imageUploader.deleteImages;
var Item = require('../models').Item;

const ALLOWED_MIME_TYPE = ['image/png', 'image/jpeg'];

module.exports = (uploadConfig) => (req, res, next) => {
  let form = new multiparty.Form();
  let partCount = 0;
  let errors = {};
  let resolveUploadPromise, rejectUploadPromise;
  let promise = new Promise((resolve, reject) => {
    resolveUploadPromise = resolve;
    rejectUploadPromise = reject;
  });

  req.form = {};

  form.on('part', part => {
    // Only accept file from part has name: 'imageFile'
    if (part.name !== 'imageFile' || !part.filename) return part.resume();
    
    // Only accept one file per upload
    if (++partCount > 1) return part.resume();
    
    // Check if content type is valid
    if (!_.includes(ALLOWED_MIME_TYPE, part.headers['content-type'])) {
      errors['imageFile'] = {
        message: 'Only PNG and JPEG file is allowed',
        message_code: 'error.upload.invalid_image_format'
      };
      rejectUploadPromise();
      return part.resume();
    }
    
    // Check for file size restriction
    let maxFileSize = uploadConfig.maxFileSize || Item.MAXIMUM_IMAGE_SIZE;
    if (part.byteCount > maxFileSize) {
      errors['imageFile'] = {
        message: `File is too big. Maximum file size allow: ${maxFileSize / 1024}KB`,
        message_code: 'error.upload.file_too_big'
      };
      rejectUploadPromise();
      return part.resume();
    }
    
    let uploadPromises = _.map(uploadConfig.versions, version => {
      let streamBuilder = gm(part);
      streamBuilder.autoOrient();
      streamBuilder.noProfile();
      streamBuilder.background('#FFFFFF');
      streamBuilder.flatten();

      if (version.crop) {
        let sizes = version.resize.split('x');
        let cropDim = version.crop.split('x');
        streamBuilder
          .resize(sizes[0], sizes[1], '^')
          .gravity('Center')
          .crop(cropDim[0], cropDim[1]);
      } else if (version.resize) {
        let sizes = version.resize.split('x');
        streamBuilder.resize(sizes[0], sizes[1]);
      }
      
      if (_.isNumber(version.quality)) {
        streamBuilder.quality(version.quality);
      }
      
      let imageFormat = version.format || 'jpg';
      let fileName = `${version.fileName}${version.suffix ? `-${version.suffix}` : ''}.${imageFormat}`;
      
      return Promise.fromCallback(cb => {
        streamBuilder.stream(imageFormat, cb);
      }).then(stream => {
        return storeImageFromStream(stream, fileName);
      });
    });
    
    Promise.all(uploadPromises).then(data => {
      req.form.image = data;
      resolveUploadPromise(data);
    }, err => {
      logger.error(err);
      errors['imageFile'] = {
        message: 'There was an error with your request',
        message_code: 'error.upload.unknown_error'
      };
      rejectUploadPromise();
    });
  });
  
  form.on('field', (name, value) => {
    verifyFields(name, value, errors, req);
  });
  
  form.on('error', err => {
    logger.error(err);
    
    let statusCode = err.statusCode ? err.statusCode : 422;
    
    res.status(statusCode);
    res.json({
      status: statusCode,
      message: 'There was an error with your request',
      message_code: 'error.upload.unknown_error'
    });
  });
  
  form.on('close', () => {
    if (!partCount) {
      // if not contain image file and there is no error just next()
      if (_.isEmpty(errors)) {
        next();
      } else {
        responseError(res,400, errors);
      }
    } else {
      promise.then((data) => {
        if (_.isEmpty(errors)) {
          next(data);
        } else {
          deleteImages(_.map(data, image => {
            return {
              Url: image.Location,
              Key: image.Key
            };
          })).then(() => {
            responseError(res,400, errors);   
          }).catch(err => {
            responseError(res,400, errors);
          });
        }
      })
      .catch(err => {
        responseError(res, 400, errors);
      });
    }
  });
  
  form.parse(req);
};

var responseError = (res, code, errors) => {
  res.status(code);
  res.json({
    status: code,
    errors: errors
  });
};

var verifyFields = (name, value, errors, req) => {
  // Verify all field for item
  switch(name) {
    case 'name':
      if (_.inRange(value.length, 1, 51)){
        req.form.name = value;
      } else {
        errors['name'] = {
          message: 'Length of name must be in [1, 50]',
          message_code: 'error.form.validation_len_failed'
        };
      }
      break;
    case 'description':
      if (_.inRange(value.length, 1, 126)) {
        req.form.description = value;
      } else {
        errors['description'] = {
          message: 'Length of description must be in [1, 125]',
          message_code: 'error.form.validation_len_failed'
        };
      }
      break; 
    case 'sort':
      if (value == parseInt(value, 10)) {
        req.form.sort = value;
      } else {
        errors['sort'] = {
          message: 'Sort must be integer',
          message_code: 'error.form.validation_data_type_failed'
        };
      }
      break;
    case 'price':
      if (value == parseInt(value, 10)) {
        req.form.price = value;
      } else {
        errors['price'] = {
          message: 'Price must be integer',
          message_code: 'error.form.validation_data_type_failed'
        };
      }
      break;
    case 'status':
      if (_.values(Item.STATUS).indexOf(parseInt(value, 10)) < 0) {
        errors['status'] = {
          message: 'Provided status is not valid',
          message_code: 'error.form.validation_data_failed'
        };
      } else {
        req.form.status = value;
      }
      break;
    case 'quantity':
      if (value == parseInt(value, 10)) {
        req.form.quantity = value;
      } else {
        errors['quantity'] = {
          message: 'Quantity must be integer',
          message_code: 'error.form.validation_data_type_failed'
        };
      }
      break;
    case 'categoryId':
      if (value == parseInt(value, 10)) {
        req.form.categoryId = value;
      } else {
        errors['categoryId'] = {
          message: 'Category Id must be integer',
          message_code: 'error.form.validation_data_type_failed'
        };
      }
      break;
    default:
      break;
  }
};
