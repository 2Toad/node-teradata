# node-teradata

[![GitHub version](https://badge.fury.io/gh/2Toad%2Fnode-teradata.svg)](https://badge.fury.io/gh/2Toad%2Fnode-teradata)
[![Downloads](https://img.shields.io/npm/dm/node-teradata.svg)](https://www.npmjs.com/package/node-teradata)
[![Build Status](https://travis-ci.org/2Toad/node-teradata.svg?branch=master)](https://travis-ci.org/2Toad/node-teradata)

Teradata for Node.js

---

## Features

 * Asynchronous
 * Read/Write
 * Prepared Statements
 * Connection Pool
 * Keep Alive

## Installation

`npm install node-teradata`

### Java

node-teradata uses JDBC to communicate with Teradata:

1. Download and install JDK 8 ([1.8.0 u112](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html))
2. Make sure Java is included in your system path

> Other versions of the JDK may work, but they have not been tested

### Teradata

A JDBC driver is provided by Teradata for communicating with their databases via Java:

1. Download the Teradata JDBC Driver ([15.10.00.33](http://downloads.teradata.com/download/connectivity/jdbc-driver))
2. Create a "jars" folder in the root of your  app
3. Extract the archive's contents into the folder:
  * tdgssconfig.jar
  * terajdbc4.jar

> Other versions of the Teradata JDBC Driver may work, but they have not been tested

## Usage

Include module
```js
var Teradata = require('node-teradata');
```

Create an instance
```js
var teradata = new Teradata(config);
```

**Example Config**
```js
var config = {
  url: 'jdbc:teradata://myserver',
  username: 'MyUsername',
  password: 'MyPassword',
  driver: './jars/',
  minPoolSize: 1,
  maxPoolSize: 100,
  keepalive: {
    interval: 60000,
    query: 'SELECT 1',
    enabled: true
  },
  jvmOptions: ['-Xrs']
};
```

### Examples

#### Read
```js
var id = 7;
var sql = 'SELECT * FROM MyDatabase.MyTable WHERE Id = ' + id;

return teradata.read(sql)
  .then(function(response) {
    console.log(response);
  });
```

#### Write
```js
var id = 7;
var sql = 'DELETE FROM MyDatabase.MyTable WHERE Id = ' + id;

return teradata.write(sql)
  .then(function(count) {
    console.log(count);
  });
```

#### Read Prepared Statement

##### Anonymous Parameters
```js
var id = 7;
var sql = 'SELECT * FROM MyDatabase.MyTable WHERE Id = ?';

return teradata.readPreparedStatement(sql, [
    teradata.createPreparedStatementParam(1, 'Int', Number(id))
  ])
  .then(function(response) {
    console.log(response);
  });
```

##### Named Parameters
```js
var id = 7;
var sql = 'SELECT * FROM MyDatabase.MyTable WHERE Id = :id';

return teradata.readPreparedStatement(sql, [
    teradata.createPreparedStatementParam('id', 'Int', Number(id))
  ])
  .then(function(response) {
    console.log(response);
  });
```

#### Write Prepared Statement

##### Anonymous Parameters
```js
var id = 7;
var username = 'Foo';
var sql = 'UPDATE MyDatabase.MyTable SET Username = ? WHERE Id = ?';

return teradata.writePreparedStatement(sql, [
    teradata.createPreparedStatementParam(1, 'String', username),
    teradata.createPreparedStatementParam(2, 'Int', Number(id))
  ])
  .then(function(count) {
    console.log(count);
  });
```

##### Named Parameters

```js
var id = 7;
var username = 'Foo';
var sql = 'UPDATE MyDatabase.MyTable SET Username = :username WHERE Id = :id';

return teradata.writePreparedStatement(sql, [
    teradata.createPreparedStatementParam('id', 'Int', Number(id)),
    teradata.createPreparedStatementParam('username', 'String', username)
  ])
  .then(function(count) {
    console.log(count);
  });
```

---

See the [docs](https://github.com/2Toad/node-teradata/tree/master/docs) for more information
