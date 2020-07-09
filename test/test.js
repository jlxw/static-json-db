'use strict';

var slugid = require('slugid');

var assert = require('assert')
const { execSync } = require('child_process');

execSync('rm -rf test/tmp/*',{stdio: 'inherit'})

const StaticJsonDb = require('../index.js')
const sjdb = new StaticJsonDb('test/tmp',{shard_threshold: 1000})


describe('sjdb', function() {
  describe('set()', function() {
    it('test long key doesnt create new shard by itself', async function() {
      let sjdb = new StaticJsonDb('test/tmp',{shard_threshold: 30})
      let k='sakldgjhajlkghsalkghsakgjhasdjkghasljgsalasbglsjagslajg', v='world'
      await sjdb.set(k,v)
      await sjdb.write()
      assert.equal((await (new StaticJsonDb('test/tmp')).getShard("")).d[k],v)
      await sjdb.set(k,v)
      await sjdb.set(k,v)
      await sjdb.set(k,v)
      await sjdb.write()
      assert.equal((await (new StaticJsonDb('test/tmp')).getShard("")).d[k],v)
      assert.equal((await (new StaticJsonDb('test/tmp')).get(k)),v);
      assert.equal((await (new StaticJsonDb('test/tmp')).getAll(""))[k],v);

      let i = await (new StaticJsonDb('test/tmp')).getAll()
      assert.equal(Object.keys(i).length,1);
    });
  })
  describe('set()', function() {

    it('test 1 key', async function() {
      let k='Hello', v='World'
      await sjdb.set(k,v)
      await sjdb.write()
      assert.equal(await (new StaticJsonDb('test/tmp')).get(k),v);
      assert.equal((await (new StaticJsonDb('test/tmp')).getAll(""))[k],v);

      let i = await (new StaticJsonDb('test/tmp')).getAll()
      assert.equal(Object.keys(i).length,1);
    });

    it('test write change in place', async function() {
      let k='Hello', v=['World']
      await sjdb.set(k,v)
      await sjdb.write()
      v.push('2')
      await sjdb.set(k,v)
      await sjdb.write()
      assert.equal(JSON.stringify(await (new StaticJsonDb('test/tmp')).get(k)),JSON.stringify(v));
    });

    it('test keys', async function() {      
      await sjdb.set('abc','world')
      await sjdb.set('dbe','world')
      await sjdb.set('hello','world')
      await sjdb.set('hello1','world1')
      await sjdb.set('hello2','world')
      await sjdb.set('hello3','world')
      await sjdb.set('hello4','world')
      await sjdb.set('hello5','world')
      await sjdb.set('hello6','world')
      await sjdb.set('hello7','world')
      await sjdb.set('hello41','world')
      await sjdb.set('hello42','world')
      await sjdb.set('hello43','world')
      await sjdb.set('hello44','world')
      await sjdb.set('hello45','world')
      await sjdb.set('hello455','world')
      await sjdb.set('hello456','world1')
      await sjdb.set('hello46','world46')
      await sjdb.write()
      assert.equal(await (new StaticJsonDb('test/tmp')).get('hello1'),'world1');
      assert.equal(await (new StaticJsonDb('test/tmp')).get('hello46'),'world46');

      let i = await (new StaticJsonDb('test/tmp')).getAll("hello4")
      assert.equal(Object.keys(i).length,9);
      assert.equal(i['hello46'],'world46');

      await sjdb.delete('hello456')
      await sjdb.write()
      assert.equal(await (new StaticJsonDb('test/tmp')).get('hello456'),undefined);
    });

    it('test 1000 keys with prefix', async function() {
      this.timeout(20000)
      let m = mock_data(2000,'abcd')
      m = m.concat(mock_data(2000,'abc'))
      for(let [k,v] of m) {
        await sjdb.set(k,v)
      }
      await sjdb.write()
      let sjdb2=new StaticJsonDb('test/tmp')
      for(let [k,v] of m) {
        assert.equal(await sjdb2.get(k),v);
      }
    });

    it('test 10000 keys', async function() {
      this.timeout(20000)
      let m = mock_data(10000)
      for(let [k,v] of m) {
        await sjdb.set(k,v)
      }
      await sjdb.write()
      let sjdb2=new StaticJsonDb('test/tmp')
      for(let [k,v] of m) {
        assert.equal(await sjdb2.get(k),v);
      }
    });

  });
});

function mock_data(keys=100,prefix="") {
  let o=[]
  for(let i=0;i<keys;i++) {
    o.push([
      prefix + slugid.v4(),
      slugid.v4()
      ])
  }
  return o
}
