'use strict';

var nodemailer = require('nodemailer');
var mg = require('nodemailer-mailgun-transport');
var EmailTemplate = require('email-templates').EmailTemplate;
var path = require('path');
var Promise = require('bluebird');
var _ = require('lodash');

var auth = {
  auth: {
    api_key: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN
  }
};

var transporter;

if (process.env.NODE_ENV !== 'production') {
  let pickupTransport = require('nodemailer-pickup-transport');
  let fs = require('fs-extra');
  let mailDirectory = path.join(__dirname, '../public/uploads/mails');
  fs.ensureDirSync(mailDirectory);

  transporter = nodemailer.createTransport(pickupTransport({
    directory: mailDirectory
  }));
} else {
  transporter = nodemailer.createTransport(mg(auth));
}

var EMAIL_TEMPLATE = {
  NEW_SHOP_OPENING_REQUEST: 'new-shop-opening-request',
  RESPONSE_SHOP_OPENING_REQUEST: 'response-shop-opening-request'
};
exports.EMAIL_TEMPLATE = EMAIL_TEMPLATE;

var EMAIL_ADDRESSES = {
  NO_REPLY: 'no-reply@fumarket.net',
  ADMIN: 'longnh1994@gmail.com',
  SHOP_REQUEST_REVIEWER: 'shop-request@fumarket.net'
};
exports.EMAIL_ADDRESSES = EMAIL_ADDRESSES;

// TODO: add test
var sendEmail = (options) => {
  return getEmailTemplate(options.template, options.data).then((result) => {
    return Promise.fromCallback(cb => {
      let emailOptions = _.pick(options, ['from', 'to', 'cc', 'bcc', 'subject']);
      emailOptions['html'] = result.html;

      transporter.sendMail(emailOptions, cb);
    });
  });
};
exports.sendEmail = sendEmail;

// TODO: add test
var getEmailTemplate = (templateName, templateData) => {
  let templateDir = path.join(__dirname, '../templates', templateName);
  let template = new EmailTemplate(templateDir);
  return Promise.fromCallback(cb => {
    template.render(templateData, cb);
  });
};
