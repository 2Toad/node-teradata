var jinst = require('jdbc/lib/jinst');
var Pool = require('jdbc/lib/pool');
var Promise = require('bluebird');

var log = getLogger();

function Teradata(config) {
  if (!config) throw new Error('Configuration required');
  this.config = config;
}

Teradata.prototype.read = function(sql) {
  var statement,
    resultSet;

  return createStatement.call(this)
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
  return this.pool.purgeAsync()
    .catch(function(error) {
      log.error('Unable to close all connections');
      throw error;
    });
};

function createStatement() {
  return open.call(this)
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
    .then(function(conn) {
      connection = conn;
      return Promise.promisifyAll(connection.conn);
    })
    .catch(function(error) {
      log.error('Unable to open connection');
      throw error;
    })
    .finally(function() {
      return close.call(this, connection);
    }.bind(this));
}

function getConnection() {
  if (this.pool) return this.pool.reserveAsync();

  return initialize.call(this)
    .then(function(pool) {
      return pool.reserveAsync();
    });
}

function initialize() {
  if (this.pool) return Promise.resolve(this.pool);

  var path = this.config.driver || './jars/';

  if (!jinst.isJvmCreated()) {
    jinst.addOption('-Xrs');
    jinst.setupClasspath([
      path + 'terajdbc4.jar',
      path + 'tdgssconfig.jar'
    ]);
  }

  var jdbcConfig = {
    url: this.config.url,
    properties: {
      user: this.config.username,
      password: this.config.password
    },
    minpoolsize: this.config.minPoolSize || 1,
    maxpoolsize: this.config.maxPoolSize || 100,
    keepalive: this.config.keepalive
  };

  var pool = Promise.promisifyAll(new Pool(jdbcConfig));

  return pool.initializeAsync()
    .then(function() {
      this.pool = pool;
      return pool;
    }.bind(this))
    .catch(function(error) {
      log.error('Unable to connect to database: ' + jdbcConfig.url);
      throw error;
    });
}

function close(connection) {
  if (!connection) return Promise.resolve();

  return this.pool.releaseAsync(connection)
    .catch(function(error) {
      log.error('Unable to close connection: ' + connection.uuid);
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
