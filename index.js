'use strict';

const path = require('path');
const fs = require('fs');

const BrowserStaticJsonDb = require('./browser.js')

module.exports = class StaticJsonDb extends BrowserStaticJsonDb {
  constructor(dir,options={}) {
    super(dir,options)
    this.options = {...{
      shard_threshold: 16384,
    }, ...options}
    if(!fs.existsSync(this.shardPath(""))) {
      this.setShard({
        key:"",
        d:{},
        s:[]
      })
    }
  }

  shardPath(key) {
    if(key.length>0) {
      let paths=[]
      for (let i = 0; i < key.length; i += 2) {
        paths.push(key.substring(i, i + 2));
      }
      return path.join(this.dir,...paths)+'.json'
    } else {
      return path.join(this.dir,'index.json')
    }
  }

  async getShard3(shard_key) {
    return(
      JSON.parse(
        await fs.promises.readFile(this.shardPath(shard_key))
      )
    )
  }

  async delete(k) {
    let shard = await this.findShard(k)
    delete shard.d[k]
    this.setShard(shard)
  }

  async set(k,v) {
    if(!k.match(/^[A-Za-z0-9_-]*$/)) {throw('key must be filename/url safe: '+k)}
    if(this.options.case_insensitive_fs) { k = k.replace(/[A-Z]/g,'($&') }
    let shard = await this.findShard(k)
    // if(JSON.stringify(shard.d[k])!=JSON.stringify(v)) { //can't do this, does not work if object is changed in place
      shard.d_keys = shard.d_keys || Object.keys(shard.d)
      if(!shard.d[k]) { shard.d_keys.push(k) }
      shard.d[k]=v
      let make_shard = this.checkMakeShard(shard,k)
      if(make_shard) {
        this.setShard(make_shard)
        Object.keys(make_shard.d).forEach(i=>delete shard.d[i])
        delete shard.d_keys
        shard.s.push(make_shard.key)
        shard.s = shard.s.filter(i=>!make_shard.s.includes(i))
      }
      this.setShard(shard)
    // }
  }

  checkMakeShard(i_shard,k) {
    let shard={d:{},s:[]}
//1 - get potential shard key, which does not encompass all keys in i_shard
    let shard_key_length = i_shard.key.length
    let i_shard_d_keys = i_shard.d_keys

    if(i_shard_d_keys.length <= 1){return}
    let shard_d_keys
    do {
      shard_key_length += 1
      shard.key = k.substring(0,shard_key_length)
      shard_d_keys = i_shard_d_keys.filter(i=>i.startsWith(shard.key))
    } while(
      shard_key_length < k.length && 
      shard_d_keys.length == i_shard_d_keys.length
    )
    if(shard_d_keys.length == i_shard_d_keys.length){return} //TODO: this is too arbitrary?

//2 - create potential shard and check size
    for(let k of shard_d_keys) {
      shard.d[k]=i_shard.d[k]
    }
    if(JSON.stringify(shard.d).length > this.options.shard_threshold) { 
      for(let v of i_shard.s) {
        if(v.startsWith(shard.key)) {shard.s.push(v)}
      }
      return shard 
    }
  }

  setShard(shard) {
    this.Cache.shards[shard.key]=shard
    this.Cache.shards_to_write[shard.key]=true
  }

  async write() {
    for(let k of Object.keys(this.Cache.shards_to_write)) {     
      await this.writeShard(this.Cache.shards[k])
      delete this.Cache.shards_to_write[k]
    }
  }

  async writeShard(shard) {
    let fn = this.shardPath(shard.key)
    let o = {d:{},s:[]}
    if(shard.key.length>0) {
      for(let [k,v] of Object.entries(shard.d)) { o.d[k.substring(shard.key.length)]=v }
      for(let i of shard.s) { o.s.push(i.substring(shard.key.length)) } 
    } else {
      o.d = shard.d
      o.s = shard.s
    }
    fs.mkdirSync(path.dirname(fn),{recursive:true})
    fs.writeFileSync(fn+'.tmp',JSON.stringify(o));
    fs.renameSync(fn+'.tmp',fn);
  }

  async getSafe(k) {
    return JSON.parse(JSON.stringify(await this.get(k)))
  }

  async setSafe(k,v) {
    return await this.set(k,JSON.parse(JSON.stringify(v)))
  }

  async optimize() {
    let o = new StaticJsonDb(this.dir+'.tmp',this.options)
    for(let [k,v] of Object.entries(await this.getAll())) {
      await o.set(k,v)
    }
    await o.write()
    fs.renameSync(this.dir,this.dir+'.old');
    fs.renameSync(this.dir+'.tmp',this.dir);
    this.resetCache()
  }
}

