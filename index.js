'use strict';

var LRU = require('lru-cache'),
    assert = require('assert'),
    debug = require('debug')('lru-cachify');

function getArgs() {
    var i = arguments.length, args = new Array(i);
    while (i--) { args[i] = arguments[i]; }
    return args;
}

function stringify() {
    return JSON.stringify(getArgs.apply(null, arguments));
}

module.exports = function (opts, fn) { // jshint maxcomplexity: 10, maxstatements: 20
    if (typeof opts === 'function') {
        fn = opts;
        opts = { };
    } else {
        opts = opts || { };
    }

    var cache = LRU(opts),
        keyFn = (typeof opts.key === 'function' ? opts.key : stringify);
    
    var enabled = true;
    
    var len = parseInt(opts.length, 10);
    if (isNaN(len)) { len = Infinity; }
    
    var normalizeArgs = (typeof opts.normalize === 'function' ? opts.normalize : getArgs);
    
    var cachified = function () {
        var args = normalizeArgs.apply(this, arguments);
        assert(Array.isArray(args), 'lru-cachify: normalize must return an array');
        var cacheKey = keyFn.apply(this, args.slice(0, Math.min(len, args.length)));

        if (enabled) {
            if (cache.has(cacheKey)) {
                debug('cache hit: %s', cacheKey);
                return cache.get(cacheKey);
            }
            
            debug('cache miss: %s', cacheKey);
        } else {
            debug('cache disabled, skipping: %s', cacheKey);
        }

        var res;
        
        // throw synchronously = don't store
        res = fn.apply(this, args);
        
        if (enabled) {
            cache.set(cacheKey, res);
            
            if (res && typeof res.then === 'function') {
                // if it's a promise, remove if it rejects
                res.then(null, function (err) {
                    // don't store rejected promise
                    cache.del(cacheKey);
                });
            }
        }
        
        return res;
    };
    
    cachified.peek = function () {
        var args = normalizeArgs.apply(this, arguments);
        assert(Array.isArray(args), 'lru-cachify: normalize must return an array');
        var cacheKey = keyFn.apply(this, args.slice(0, Math.min(len, args.length)));
        
        return cache.peek(cacheKey);
    };
    
    cachified.delete =
    cachified.del = function () {
        var args = normalizeArgs.apply(this, arguments);
        assert(Array.isArray(args), 'lru-cachify: normalize must return an array');
        var cacheKey = keyFn.apply(this, args.slice(0, Math.min(len, args.length)));
        
        debug('deleting: %s', cacheKey);
        return cache.del(cacheKey);
    };
    
    cachified.has = function () {
        var args = normalizeArgs.apply(this, arguments);
        assert(Array.isArray(args), 'lru-cachify: normalize must return an array');
        var cacheKey = keyFn.apply(this, args.slice(0, Math.min(len, args.length)));

        return cache.has(cacheKey);
    };
    
    cachified.disableCache = function () { enabled = false; };
    cachified.enableCache = function () { enabled = true; };
    
    // inherit other cache methods
    for (var key in cache) {
        if (!/^_/.test(key) && typeof cache[key] === 'function' && !cachified.hasOwnProperty(key)) {
            cachified[key] = cache[key].bind(cache);
        }
    }
    
    return cachified;
};
