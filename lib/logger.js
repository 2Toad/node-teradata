/*
 * node-teradata
 * Copyright (c) 2017 2Toad, LLC
 * https://github.com/2Toad/node-teradata
 *
 * Version: 1.3.1
 * License: MIT
 */

var winston = require('winston');
var _ = require('lodash');

var logger = {};

logger.configure = function(config) {
  winston.configure(_.defaultsDeep(config, {
    transports: [
      new winston.transports.Console({
        colorize: true,
        timestamp: true
      })
    ]
  }));
};

logger.error = function(message) {
  log(_.concat(['error', message], arguments));
};

logger.debug = function(message) {
  log(_.concat(['debug', message], arguments));
};

function log(level, message) {
  winston[level](_.concat(['Teradata: ' + message], arguments));
}

module.exports = logger;
