/*
 * node-teradata
 * Copyright (c) 2017 2Toad, LLC
 * https://github.com/2Toad/node-teradata
 *
 * Version: 1.4.0
 * License: MIT
 */

var winston = require('winston');
var _ = require('lodash');

module.exports = {
  init: function(config) {
    var logger = new winston.Logger(_.defaultsDeep(config, {
      transports: [
        new winston.transports.Console({
          label: 'Teradata',
          colorize: true,
          timestamp: function() {
            return new Date().toLocaleString();
          }
        })
      ]
    }));

    _.extend(this, {
      debug: logger.debug,
      error: logger.error
    });
  }
};
