const StaticJsonDb = require('../index.js')
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