

# static-json-db
## The Native Jamstack Database.
[![Build Status](https://github.com/jlxw/static-json-db/workflows/Test/badge.svg)](https://github.com/jlxw/static-json-db/actions?query=workflow%3ATest)

A NoSQL key-value database stored as a directory tree of small JSON files which can be deployed as part of a static website and queried from client browsers in an efficient manner. Minified JS for browser ~1.5KB.

### Demo / Proof of Concept
  - [www.playliststar.com](https://www.playliststar.com/)

### Example Usage

#### Node.js
```sh
$ npm install static-json-db
```

```js
const StaticJsonDb = require('static-json-db')
const db = new StaticJsonDb('data'); // using directory 'data'

(async () => {
  await db.set('key1','Hello World1')
  await db.set('key2','Hello World2')
  await db.set('abc','def')

  console.log(await db.get('key1')) // Hello World1

  // get all keys starting with 'key'
  console.log(await db.getAll('key')) // { key1: 'Hello World1', key2: 'Hello World2' }

  await db.delete('key2')

  // get all keys
  console.log(await db.getAll()) // { key1: 'Hello World1', abc: 'def' }

  //write to disk
  await db.write()
})();
```

#### HTML
https://jlxw.github.io/static-json-db/example.html
```html
<html>
  <head>
    <script src="https://jlxw.github.io/static-json-db/static-json-db.min.js"></script>
    <script>
      const db = new StaticJsonDb(new URL('data',window.location));
      (async () => {
        console.log(await db.get('key1')) // Hello World1
        console.log(await db.getAll()) // {key1: "Hello World1", abc: "def"}
      })();
    </script>
  </head>
</html>
```
### Notes
- If you need to modify in place objects returned by .get() or sent to .set(), use .getSafe() or .setSafe() instead

### Why?
Hosting for JAMStack / static websites are almost free now, and can be very easily and cheaply scaled. static-json-db can be a lower-cost alternative to traditional databases that do not need to be updated frequently. The proof of concept [www.playliststar.com](https://www.playliststar.com/) is updated on an hourly basis with ~200K tracks across ~7K playlists.

In the future I imagine adding a real-time component to complement static-json-db. Probably a very simple server that appends to a flat JSON file, which is served as a static file, and periodically "merged" with the "main" db.

### License

MIT