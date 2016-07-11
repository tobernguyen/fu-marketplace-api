'use strict';

const KEYS = {
  SHOP_REQUEST_MAILING_LIST: 'ShopRequestMailingList',
  PINNED_SHOP_IDS: 'PinnedShopIds'
};

module.exports = function(sequelize, DataTypes) {
  let Configuration = sequelize.define('Configuration', {
    key: {
      allowNull: false,
      type: DataTypes.STRING,
      unique: true
    },
    value: {
      allowNull: false,
      type: DataTypes.JSON
    }
  }, {

  });

  Configuration.set = (key, value) => {
    return Configuration.upsert({key: key, value: value});
  };

  Configuration.get = (key) => {
    return Configuration.findOne({
      where: {
        key: key
      },
      attributes: ['value']
    }).then(c => Promise.resolve(c ? c.value : c));
  };

  Configuration.KEYS = KEYS;

  return Configuration;
};
