var redis = require('redis');

var Redlight = function(options){
  if(!options){
    options = {};
  }

  if(!options.redis){
    options.redis = {};
  }

  this.options = {
    maxRequests: options.maxRequests || 1,
    expire: options.expire || 100,
    redis: {
      port: options.redis.port || 6379,
      host: options.redis.host || '127.0.0.1',
      redis: options.redis.options || {}
    }
  };

  this.redis = redis.createClient(this.options.redis.port, this.options.redis.host, this.options.redis.options);
};

Redlight.prototype = {};

Redlight.prototype.increment = function(hostname){
  this.redis.incr('redlight:' + hostname);
};

Redlight.prototype.setExpiry = function(hostname){
  this.redis.pexpire('redlight:' + hostname, this.options.expire);
};

Redlight.prototype.setClient = function(hostname){
  var _this = this;
  this.redis.setnx('redlight:' + hostname, 0, function(err, res){
    if(res === 1){
      _this.setExpiry(hostname);
    }
  });
};

Redlight.prototype.getRequestCount = function(hostname, cb){
  this.redis.get('redlight:' + hostname, function(err, res){
    cb(res);
  })
};

Redlight.prototype.middleware = function(req, res, next){

  var hostname = req.ip;

  this.setClient(hostname);
  this.increment(hostname);

  this.getRequestCount(hostname, function(count){
    if(count > this.maxRequests){
      res.status(429).send('Rate limit exceeded');
    } else {
      next();
    }
  })

};

module.exports = Redlight;
