'use strict';

var multiparty = require('multiparty');
var AWS = require('aws-sdk');
var gm = require('gm');
var assert = require('assert');
var _ = require('lodash');
var Promise = require('bluebird');
var logger = require('./logger');

const ALLOWED_MIME_TYPE = ['image/png', 'image/jpeg'];

var isUploadToS3 = process.env.UPLOAD_TO_S3 == 'true';

if (isUploadToS3) {
  // Config AWS S3
  assert(process.env.AWS_S3_BUCKET, 'AWS_S3_BUCKET is not defined in environment variable');
  AWS.config.region = 'ap-southeast-1';
  var s3Client = Promise.promisifyAll(new AWS.S3({params: {Bucket: process.env.AWS_S3_BUCKET}}));
} else {
  var fs = require('fs-extra');
}

var storeImageFromStream = (stream, fileName) => {
  if (isUploadToS3) {
    return s3Client.uploadAsync({
      Key: fileName,
      Body: stream,
      ACL: 'public-read'  
    });
  } else {
    return new Promise((resolve, reject) => {
      let localFileName;
      
      // Upload to test folder for test environment
      if (process.env.NODE_ENV == 'test') {
        localFileName = `public/uploads/__test__/${fileName}`;
      } else {
        localFileName = `public/uploads/${fileName}`;
      }
      
      fs.ensureFile(localFileName, err => {
        if (err) return reject(err);
        
        var writeStream = fs.createWriteStream(localFileName);
        stream.pipe(writeStream);
        writeStream.on('close', () => {
          resolve({
            Location: `http://localhost:3000/uploads/${fileName}`,
            Key: localFileName
          });
        });
        writeStream.on('error', reject);
      });
    });
  }
};

var deleteImages = (imageVersions) => {
  let promises = _.map(imageVersions, image => deleteImageByKey(image.Key));
  return Promise.all(promises);
};

var deleteImageByKey = key => {
  if (!isUploadToS3) {
    return Promise.fromCallback(cb => {
      fs.remove(key, cb);
    });
  } else {
    return Promise.fromCallback(cb => {
      s3Client.deleteObject({Key: key}, cb);
    });
  }
};

module.exports = {
  storeImageFromStream: storeImageFromStream,
  deleteImages: deleteImages,
  useMiddlewareWithConfig: (uploadConfig) => (req, res, next) => {
    let form = new multiparty.Form();
    let partCount = 0;
    
    form.on('part', part => {
      // Only accept file from part has name: 'file'
      if (part.name !== 'file' || !part.filename) return part.resume();
      
      // Only accept one file per upload
      if (++partCount > 1) return part.resume();
            
      // Default limit file size to 5MB
      let maxFileSize = uploadConfig.maxFileSize || 5 * 1024 * 1024;
      
      // Check if content type is valid
      if (!_.includes(ALLOWED_MIME_TYPE, part.headers['content-type'])) {
        res.status(422);
        res.json({
          status: 422,
          message: 'Only PNG and JPEG file is allowed',
          message_code: 'error.upload.invalid_image_format'
        });
        part.resume();
      } else if (part.byteCount <= maxFileSize) {
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
          req.uploadResults = data;
          next(data);
        }, err => {
          logger.error(err);
          
          let statusCode = err.statusCode ? err.statusCode : 422;
      
          res.status(statusCode);
          res.json({
            status: statusCode,
            message: 'There was an error with your request',
            message_code: 'error.upload.unknown_error'
          });
        });
      } else {
        res.status(406);
        res.json({
          status: 406,
          message: `File is too big. Maximum file size allow: ${maxFileSize / 1024}KB`,
          message_code: 'error.upload.file_too_big'
        });
        part.resume();
      }
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
        res.status(400);
        res.json({
          status: 400,
          message: 'Invalid request, file is required',
          message_code: 'error.upload.file_is_required'
        });
      }
    });
    
    form.parse(req);
  }
};