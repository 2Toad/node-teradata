# node-teradata

[![GitHub version](https://badge.fury.io/gh/2Toad%2Fnode-teradata.svg)](https://badge.fury.io/gh/2Toad%2Fnode-teradata)
[![Downloads](https://img.shields.io/npm/dm/node-teradata.svg)](https://www.npmjs.com/package/node-teradata)
[![Build Status](https://travis-ci.org/2Toad/node-teradata.svg?branch=master)](https://travis-ci.org/2Toad/node-teradata)

Teradata for Node.js

---

## Features

 - Asynchronous
 - Read/Write
 - Prepared Statements
 - Connection Pool
 - Keep Alive

## Installation

`npm install node-teradata`

### Java

node-teradata uses JDBC to communicate with Teradata:

1. Download and install JDK 8 ([1.8.0 u112](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html))
2. Make sure Java is included in your system path

>**NOTE**
>node-teradata may work with other versions of the JDK, but they have not been tested

### Teradata

A JDBC driver is provided by Teradata for communicating with their databases via Java:

1. Download the Teradata JDBC Driver ([15.10.00.33](http://downloads.teradata.com/download/connectivity/jdbc-driver))
2. Create a "jars" folder in the root of your  app
3. Extract the archive's contents into the folder:
  - tdgssconfig.jar
  - terajdbc4.jar

## Usage

Include module
```js
import Teradata from 'node-teradata';
```

Create an instance
```js
const teradata = new Teradata(config);
```

**Example Config**
```js
const config = {
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
  }
};
```

### Examples

#### Read
```js
const id = 7;
const sql = `SELECT * FROM MyDatabase.MyTable WHERE Id = ${id}`;

return teradata.read(sql)
  .then(response => {
    console.log(response);
  });
```

#### Write
```js
const id = 7;
const sql = `DELETE FROM MyDatabase.MyTable WHERE Id = ${id}`;

return teradata.write(sql)
  .then(count => {
    console.log(count);
  });
```

#### Read Prepared Statement
```js
const id = 7;
const sql = 'SELECT * FROM MyDatabase.MyTable WHERE Id = ?';

return teradata.readPreparedStatement(sql, [
    teradata.createPreparedStatementParam(1, 'Int', Number(id))
  ])
  .then(response => {
    console.log(response);
  });
```

#### Write Prepared Statement
```js
const id = 7;
const username = 'Foo';
const sql = 'UPDATE MyDatabase.MyTable SET Username = ? WHERE Id = ?';

return teradata.writePreparedStatement(sql, [
    teradata.createPreparedStatementParam(1, 'String', username),
    teradata.createPreparedStatementParam(2, 'Int', Number(id))
  ])
  .then(count => {
    console.log(count);
  });
```
