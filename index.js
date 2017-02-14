/*
 * node-teradata
 * Copyright (c) 2017 2Toad, LLC
 * https://github.com/2Toad/node-teradata
 *
 * Version: 1.3.1
 * License: MIT
 */

var jinst = require('jdbc/lib/jinst');
var Pool = require('jdbc/lib/pool');
var Promise = require('bluebird');
var _ = require('lodash');

var log = getLogger();

function Teradata(config) {
  if (!config) throw new Error('Configuration required');

  this.connections = [];
  this.config = _.defaultsDeep(config, {
    driver: './jars/',
    minPoolSize: 1,
    maxPoolSize: 100,
    keepalive: {
      interval: 60000,
      query: 'SELECT 1',
      enabled: false
    }
  });

  Object.defineProperty(this, 'initialized', {
    get: function() {
      return Boolean(this.pool);
    }
  });
}

Teradata.prototype.read = function(sql, connection) {
  var statement,
    resultSet;

  return createStatement.call(this, connection)
    .then(function(s) {
      statement = s;
      return statement.executeQueryAsync(sql);
    })
    .then(function(rs) {
      resultSet = Promise.promisifyAll(rs);
      return resultSet.toObjArrayAsync();
    })
    .then(function(objectArray) {
      return objectArray;
    })
    .catch(function(error) {
      log.error('Unable to execute query: ' + sql);
      throw error;
    })
    .finally(function() {
      return Promise.resolve(statement && statement.closeAsync())
        .finally(function() {
          return Promise.resolve(resultSet && resultSet.closeAsync());
        });
    });
};

Teradata.prototype.write = function(sql) {
  var statement;

  return createStatement.call(this)
    .then(function(s) {
      statement = s;
      return statement.executeUpdateAsync(sql);
    })
    .then(function(count) {
      return count;
    })
    .finally(function() {
      return Promise.resolve(statement && statement.closeAsync());
    });
};

Teradata.prototype.readPreparedStatement = function(sql, params) {
  var preparedStatement,
    resultSet;

  return createPreparedStatement.call(this, sql, params)
    .then(function(ps) {
      preparedStatement = ps;
      return preparedStatement.executeQueryAsync();
    })
    .then(function(rs) {
      resultSet = Promise.promisifyAll(rs);
      return resultSet.toObjArrayAsync();
    })
    .then(function(objectArray) {
      return objectArray;
    })
    .catch(function(error) {
      log.error('Unable to execute query: ' + sql);
      throw error;
    })
    .finally(function() {
      return Promise.resolve(preparedStatement && preparedStatement.closeAsync())
        .finally(function() {
          return Promise.resolve(resultSet && resultSet.closeAsync());
        });
    });
};

Teradata.prototype.writePreparedStatement = function(sql, params) {
  var preparedStatement;

  return createPreparedStatement.call(this, sql, params)
    .then(function(ps) {
      preparedStatement = ps;
      return preparedStatement.executeUpdateAsync();
    })
    .then(function(count) {
      return count;
    })
    .catch(function(error) {
      log.error('Unable to execute query: ' + sql);
      throw error;
    })
    .finally(function() {
      return Promise.resolve(preparedStatement && preparedStatement.closeAsync());
    });
};

Teradata.prototype.createPreparedStatementParam = function(index, type, value) {
  return {
    index: index,
    type: type,
    value: value
  };
};

Teradata.prototype.closeAll = function() {
  _.each(this.connections, function(connection) {
    clearInterval(connection.keepAliveIntervalId);
    delete connection.keepAliveIntervalId;
  });

  return this.pool.purgeAsync()
    .catch(function(error) {
      log.error('Unable to close all connections');
      throw error;
    });
};

function createStatement(connection) {
  var promise = connection && Promise.resolve(connection) || open.call(this);

  return promise
    .then(function(connection) {
      return connection.createStatementAsync()
        .then(function(statement) {
          return Promise.promisifyAll(statement);
        });
    })
    .catch(function(error){
      log.error('Unable to create statement');
      throw error;
    });
}

function createPreparedStatement(sql, params) {
  return open.call(this)
    .then(function(connection) {
      return connection.prepareStatementAsync(sql)
        .then(function(preparedStatement) {
          Promise.promisifyAll(preparedStatement);

          return Promise.all(params.map(function(param) {
            var setTypeAsync = 'set' + param.type + 'Async';
            if (!preparedStatement[setTypeAsync]) throw new Error('Invalid parameter type: ' + param.type);

            return preparedStatement[setTypeAsync](param.index, param.value);
          }))
          .then(function() {
            return preparedStatement;
          });
        });
    })
    .catch(function(error){
      log.error('Unable to create prepared statement');
      throw error;
    });
}

function open() {
  var connection;

  return getConnection.call(this)
    .then(function(c) {
      connection = c;
      this.connections.push(connection);

      return Promise.promisifyAll(connection.conn);
    }.bind(this))
    .tap(function() {
      if (connection.keepAliveIntervalId || !this.config.keepalive.enabled) return;

      connection.keepAliveIntervalId = setInterval(function() {
        keepAlive.call(this, connection.conn);
      }.bind(this), this.config.keepalive.interval);
    }.bind(this))
    .catch(function(error) {
      log.error('Unable to open connection');
      throw error;
    })
    .finally(function() {
      return release.call(this, connection);
    }.bind(this));
}

function getConnection() {
  if (this.initialized) return this.pool.reserveAsync();

  return initialize.call(this)
    .then(function(pool) {
      return pool.reserveAsync();
    });
}

function initialize() {
  if (this.initialized) return Promise.resolve(this.pool);

  if (!jinst.isJvmCreated()) {
    jinst.addOption('-Xrs');
    jinst.setupClasspath([
      this.config.driver + 'terajdbc4.jar',
      this.config.driver + 'tdgssconfig.jar'
    ]);
  }

  var jdbcConfig = {
    url: this.config.url,
    properties: {
      user: this.config.username,
      password: this.config.password
    },
    minpoolsize: this.config.minPoolSize,
    maxpoolsize: this.config.maxPoolSize
  };

  var pool = Promise.promisifyAll(new Pool(jdbcConfig));

  return pool.initializeAsync()
    .then(function() {
      this.pool = pool;
      return pool;
    }.bind(this))
    .catch(function(error) {
      log.error('Unable to connect to server: ' + jdbcConfig.url);
      throw error;
    });
}

function keepAlive(connection) {
  return this.read(this.config.keepalive.query, connection)
    .catch(function() {
      log.error('Keep Alive failed');
    });
}

function release(connection) {
  if (!connection) return Promise.resolve();

  return this.pool.releaseAsync(connection)
    .catch(function(error) {
      log.error('Unable to release connection: ' + connection.uuid);
      throw error;
    });
}

// Make use of global logger if available (e.g., Winston),
// otherwise fallback to console
function getLogger() {
  return global.logger && typeof global.logger.error === 'function'
    ? global.logger
    : global.log && typeof global.log.error === 'function'
      ? global.log
      : global.winston || console;
}

module.exports = Teradata;
