class StaticJsonDb {
  constructor(dir,options={}) {
    this.options = {...{
      case_insensitive_fs: false
    }, ...options}
    this.dir = dir
    this.resetCache()
    this.getShardPromises = {}
  }

  resetCache() {
    this.Cache = {
      d: {},
      shards: {},
      shards_to_write: {},
    }
  }

  async getAll(prefix="",o={},f=false,abortCallback) {
    if(!f && this.options.case_insensitive_fs) { prefix = prefix.replace(/[A-Z]/g,'($&') }
    let i = await this.findShard(prefix,undefined,abortCallback)
    for(let [k,v] of Object.entries(i.d)) {
      if(f || k.startsWith(prefix)) {
        if(this.options.case_insensitive_fs) { k = k.replace(/\(/g,'') }
        o[k]=v
      }
    }
    if(abortCallback && abortCallback()===false){return o}
    let p = []
    for(let k of i.s) {
      if(f || k.startsWith(prefix)) {
        p.push(this.getAll(k,o,true,abortCallback))
      }
    }
    await Promise.all(p)
    return o
  }

  async get(k,abortCallback) {
    if(this.options.case_insensitive_fs) { k = k.replace(/[A-Z]/g,'($&') }
    return (await this.findShard(k,undefined,abortCallback)).d[k]
  }

  shardPath(key) {
    if(key.length>0) {
      let o=this.dir
      for (let i = 0; i < key.length; i += 2) {
        o=new URL(key.substring(i, i + 2),o+'/')
      }
      return o+'.json'
    } else {
      return new URL('index.json',this.dir+'/')
    }
  }

  async findShard(k,from_shard_key="",abortCallback) {
    let i=await this.getShard(from_shard_key)
    if(i.d[k]) {
      return i
    } else {
      if(abortCallback && abortCallback()===false){return i}
      let shard_key = i.s.find(i=>k.startsWith(i))
      if(shard_key) {
        // console.log(k,shard_key)
        return this.findShard(k,shard_key)
      } else {
        return i
      }
    }
  }

  async getShard(shard_key) {
    if(this.Cache.shards[shard_key]) { 
      return this.Cache.shards[shard_key]
    } else {
      this.getShardPromises[shard_key] = this.getShardPromises[shard_key] || this.getShard2(shard_key)
      let o = await this.getShardPromises[shard_key]
      delete this.getShardPromises[shard_key]
      return o
    }
  }
  async getShard2(shard_key) {
    let i=await this.getShard3(shard_key)
    let o={d:{},s:[],key:shard_key}
    
    for(let [k,v] of Object.entries(i.d)) { 
      o.d[shard_key+k]=v 
    }
    for(let k of i.s) { o.s.push(shard_key+k) } 
    
    this.Cache.shards[shard_key]=o
    return o
  }
  getShard3(shard_key) {
    return(fetch(this.shardPath(shard_key)).then(i=>i.json()))
  }
}

if (typeof module === 'object' && module.exports) { module.exports = StaticJsonDb }