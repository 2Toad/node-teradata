/*
 * node-teradata
 * Copyright (c) 2017 2Toad, LLC
 * https://github.com/2Toad/node-teradata
 *
 * Version: 1.1.0
 * License: MIT
 */

import jinst from 'jdbc/lib/jinst';
import Pool from 'jdbc/lib/pool';
import Promise from 'bluebird';

const log = getLogger();

class Teradata {
  constructor(config) {
    if (!config) throw new Error('Configuration required');
    this.config = config;
  }

  read(sql) {
    let statement;
    let resultSet;

    return createStatement.call(this)
      .then(s => {
        statement = s;
        return statement.executeQueryAsync(sql);
      })
      .then(rs => {
        resultSet = Promise.promisifyAll(rs);
        return resultSet.toObjArrayAsync();
      })
      .then(objectArray => objectArray)
      .catch(error => {
        log.error(`Unable to execute query: ${sql}`);
        throw error;
      })
      .finally(() => Promise.resolve(statement && statement.closeAsync())
      .finally(() => Promise.resolve(resultSet && resultSet.closeAsync())));
  }

  write(sql) {
    let statement;

    return createStatement.call(this)
      .then(s => {
        statement = s;
        return statement.executeUpdateAsync(sql);
      })
      .then(count => count)
      .finally(() => Promise.resolve(statement && statement.closeAsync()));
  }

  readPreparedStatement(sql, params) {
    let preparedStatement;
    let resultSet;

    return createPreparedStatement.call(this, sql, params)
      .then(ps => {
        preparedStatement = ps;
        return preparedStatement.executeQueryAsync();
      })
      .then(rs => {
        resultSet = Promise.promisifyAll(rs);
        return resultSet.toObjArrayAsync();
      })
      .then(objectArray => objectArray)
      .catch(error => {
        log.error(`Unable to execute query: ${sql}`);
        throw error;
      })
      .finally(() => Promise.resolve(preparedStatement && preparedStatement.closeAsync())
      .finally(() => Promise.resolve(resultSet && resultSet.closeAsync())));
  }

  writePreparedStatement(sql, params) {
    let preparedStatement;

    return createPreparedStatement.call(this, sql, params)
      .then(ps => {
        preparedStatement = ps;
        return preparedStatement.executeUpdateAsync();
      })
      .then(count => count)
      .catch(error => {
        log.error(`Unable to execute query: ${sql}`);
        throw error;
      })
      .finally(() => Promise.resolve(preparedStatement && preparedStatement.closeAsync()));
  }

  createPreparedStatementParam(index, type, value) {
    return {
      index,
      type,
      value
    };
  }

  closeAll() {
    return this.pool.purgeAsync()
      .catch(error => {
        log.error('Unable to close all connections');
        throw error;
      });
  }
}

function createStatement() {
  return open.call(this)
    .then(connection => connection.createStatementAsync()
    .then(statement => Promise.promisifyAll(statement)))
    .catch(error => {
      log.error('Unable to create statement');
      throw error;
    });
}

function createPreparedStatement(sql, params) {
  return open.call(this)
    .then(connection => connection.prepareStatementAsync(sql)
    .then(preparedStatement => {
      Promise.promisifyAll(preparedStatement);

      return Promise.all(params.map(param => {
        const setTypeAsync = `set${param.type}Async`;
        if (!preparedStatement[setTypeAsync]) throw new Error(`Invalid parameter type: ${param.type}`);

        return preparedStatement[setTypeAsync](param.index, param.value);
      }))
      .then(() => preparedStatement);
    }))
    .catch(error => {
      log.error('Unable to create prepared statement');
      throw error;
    });
}

function open() {
  let connection;

  return getConnection.call(this)
    .then(conn => {
      connection = conn;
      return Promise.promisifyAll(connection.conn);
    })
    .catch(error => {
      log.error('Unable to open connection');
      throw error;
    })
    .finally(() => close.call(this, connection));
}

function getConnection() {
  if (this.pool) return this.pool.reserveAsync();

  return initialize.call(this)
    .then(pool => pool.reserveAsync());
}

function initialize() {
  if (this.pool) return Promise.resolve(this.pool);

  const path = this.config.driver || './jars/';

  if (!jinst.isJvmCreated()) {
    jinst.addOption('-Xrs');
    jinst.setupClasspath([
      `${path}terajdbc4.jar`,
      `${path}tdgssconfig.jar`
    ]);
  }

  const jdbcConfig = {
    url: this.config.url,
    properties: {
      user: this.config.username,
      password: this.config.password
    },
    minpoolsize: this.config.minPoolSize || 1,
    maxpoolsize: this.config.maxPoolSize || 100,
    keepalive: this.config.keepalive
  };

  const pool = Promise.promisifyAll(new Pool(jdbcConfig));

  return pool.initializeAsync()
    .then(() => {
      this.pool = pool;
      return pool;
    })
    .catch(error => {
      log.error(`Unable to connect to database: ${jdbcConfig.url}`);
      throw error;
    });
}

function close(connection) {
  if (!connection) return Promise.resolve();

  return this.pool.releaseAsync(connection)
    .catch(error => {
      log.error(`Unable to close connection: ${connection.uuid}`);
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

export default Teradata;
