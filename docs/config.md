# Config

The node-teradata constructor requires a config object:

## Properties
| Property    | Type   | Details                                                                                                                        | Default   |
|-------------|--------|--------------------------------------------------------------------------------------------------------------------------------|-----------|
| url         | string | Teradata server URL                                                                                                            | undefined |
| username    | string | Teradata username                                                                                                              | undefined |
| password    | string | Teradata password                                                                                                              | undefined |
| driver      | string | Location of the Teradata JDBC Driver                                                                                           | ./jars/   |
| minPoolSize | number | The number of connections to fill the pool with when the lib is initialized                                                    | 1         |
| maxPoolSize | number | When a connection is requested, and the pool is empty, a new connection will be added to the pool until this number is reached | 100       |
| keepalive   | object | (see [keepAlive Properties](#keepalive-properties))                                                                            | ---       |
| logger      | object | (see [logger Properties](#logger-properties))                                                                                  | ---       |
| jvmOptions  | array  | An array of strings of jvm options (Your array will not be merged with the default array, it will replace it)                  | ['-Xrs']  |

### keepalive Properties
| Property | Type    | Details                                             | Default       |
|----------|---------|-----------------------------------------------------|---------------|
| interval | number  | The number of milliseconds between query executions | 60000         |
| query    | string  | The query to execute on the connetion               | SELECT&nbsp;1 |
| enabled  | boolean | When `false` the query is not executed              | false         |

### logger Properties
| Property | Type   | Details                                             | Default |
|----------|--------|-----------------------------------------------------|---------|
| level    | string | The maximum level of messages that should be logged | `error` |

> node-teradata uses [winston](https://github.com/winstonjs/winston) for logging. Please see winston's documentation for supported `level` values

## Example
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
  logger: {
    level: 'debug'
  },
  jvmOptions: ['-Xrs']
};
```
