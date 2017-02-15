# Cleanup

node-teradata exposes the `closeAll` function to facilitate cleanup. How you implement cleanup in your app is entirely up to you, but here's one example:

## Example

In this example we use [node-cleanup](https://www.npmjs.com/package/node-cleanup), to cleanup node-teradata connections when:

* The process exits normally (exit code 0).
* The process exits due to an error, such as an uncaught exception (exit code 1).
* The process receives one of the following POSIX signals: SIGINT (e.g. Ctrl-C), SIGHUP, SIGQUIT, or SIGTERM.

```js
var teradata = new Teradata(config);
```

...

```js
var cleanup = require('node-cleanup');

cleanup(function(exitCode, signal) {
  if (!signal || !teradata.initialized) return;

  teradata.closeAll()
    .then(function() {
      process.kill(process.pid, signal);
    });

  cleanup.uninstall();
  return false;
});
```
