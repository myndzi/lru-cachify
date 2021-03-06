'use strict';

var cachify = require('./index');

require('should');

describe('Cachify', function () {
    it('should cachify a function', function () {
        var calls = 0;
        
        var cached = cachify(function (n) {
            calls++;
            return n;
        });
        
        cached(3).should.equal(3);
        cached(3).should.equal(3);
        
        cached('foo').should.equal('foo');
        cached('foo').should.equal('foo');
        
        var obj = { };
        cached(obj).should.equal(obj);
        cached(obj).should.equal(obj);
        
        calls.should.equal(3);
    });
    it('should default opts to an empty object', function () {
        var calls = 0;
        var cached = cachify(null, function (n) {
            calls++;
            return n;
        });
        
        cached(3).should.equal(3);
        cached(3).should.equal(3);
        calls.should.equal(1);
    });
    it('should allow caching to be disabled/enabled', function () {
        var calls = 0;
        
        var cached = cachify(function (n) {
            calls++;
            return n;
        });
        
        cached(3).should.equal(3);
        cached(3).should.equal(3);
        
        cached('foo').should.equal('foo');
        cached('foo').should.equal('foo');
        
        var obj = { };
        cached(obj).should.equal(obj);
        cached(obj).should.equal(obj);
        
        calls.should.equal(3);
        
        cached.disableCache();
        cached('foo').should.equal('foo');
        calls.should.equal(4);
        
        cached.enableCache();
        cached('foo').should.equal('foo');
        calls.should.equal(4);
    });
    it('should pass options to LRU', function () {
        var calls = 0;
        
        var cached = cachify({
            max: 1
        }, function (n) {
            calls++;
            return n;
        });
        
        cached(3).should.equal(3);
        cached(3).should.equal(3);
        
        cached('foo').should.equal('foo');
        cached(3).should.equal(3);
        cached('foo').should.equal('foo');
        calls.should.equal(4);
    });
    it('should allow for a custom key generation function', function () {
        var calls = 0;
        
        var cached = cachify({
            max: 1,
            key: function () { return 'bar'; }
        }, function (n) {
            calls++;
            return n;
        });
        
        cached(3).should.equal(3);
        cached(3).should.equal(3);
        
        cached('foo').should.equal(3);
        cached(3).should.equal(3);
        cached('foo').should.equal(3);
        calls.should.equal(1);
    });
    it('should allow for argument normalization', function () {
        var calls = 0;
        var cached = cachify({
            max: 1,
            normalize: function (id, opts) {
                if (id && typeof id === 'object') {
                    opts = id;
                    id = null;
                } else {
                    id = parseInt(id, 10);
                    if (isNaN(id)) { id = null; }
                    opts = opts || { };
                }
                return [id, opts];
            }
        }, function (id, opts) {
            calls++;
            return id || opts.id;
        });
        
        cached(3, { foo: 'bar' }).should.eql(3);
        cached({ id: 3, foo: 'bar' }).should.eql(3);
        cached(null, { id: 3, foo: 'bar' }).should.eql(3);
        
        calls.should.equal(2);
    });
    it('should apply normalization to \'peek\'', function () {
        var calls = 0;
        var cached = cachify({
            normalize: function (a, b) {
                return [ a + b ];
            }
        }, function (key) {
            calls++;
            return key;
        });
        
        cached('foo', 'bar').should.equal('foobar');
        cached('fooba', 'r').should.equal('foobar');
        calls.should.equal(1);
        
        cached.peek('fo', 'obar').should.equal('foobar');
    });
    it('should apply normalization to \'has\'', function () {
        var calls = 0;
        var cached = cachify({
            normalize: function (a, b) {
                return [ a + b ];
            }
        }, function (key) {
            calls++;
            return key;
        });
        
        cached('foo', 'bar').should.equal('foobar');
        cached('fooba', 'r').should.equal('foobar');
        calls.should.equal(1);
        
        cached.has('fo', 'obar').should.equal(true);
    });
    it('should apply normalization to \'del\'', function () {
        var calls = 0;
        var cached = cachify({
            normalize: function (a, b) {
                return [ a + b ];
            }
        }, function (key) {
            calls++;
            return key;
        });
        
        cached('foo', 'bar').should.equal('foobar');
        cached('fooba', 'r').should.equal('foobar');
        calls.should.equal(1);
        
        cached.del('fo', 'obar');
        cached.has('foobar').should.equal(false);
    });
    it('should \'apply\' arguments to normalize function', function () {
        var cached = cachify({
            max: 1,
            normalize: function (id, opts) {
                arguments.length.should.equal(2);
                return [id, opts];
            }
        }, function () { });
        cached(1, 2);
    });
    it('should throw if normalize function does not return an array', function () {
        var cached = cachify({
            max: 1,
            normalize: function (id, opts) {
                arguments.length.should.equal(2);
            }
        }, function () { });
        (function () {
            cached(1, 2);
        }).should.throw(/normalize must return an array/);
    });
    it('should allow for argument shortening', function () {
        var calls = 0;
        var cached = cachify({
            length: 1
        }, function (a, b) {
            calls++;
            return a;
        });
        
        cached(1, 2).should.equal(1);
        cached(1, 3).should.equal(1);
        
        calls.should.equal(1);
    });
    it('should shorten arguments AFTER normalizing them', function () {
        var calls = 0;
        var cached = cachify({
            length: 1,
            normalize: function (a, b) {
                if (Array.isArray(a)) { return a; }
                return [a, b];
            }
        }, function (a, b) {
            calls++;
            return a;
        });
        
        cached(1, 2).should.equal(1);
        cached([1, 3]).should.equal(1);
        
        calls.should.equal(1);
    });
    it('should expose cache.reset', function () {
        var calls = 0;
        var cached = cachify(function (n) {
            calls++;
            return n;
        });
        
        cached(1).should.equal(1);
        cached.reset();
        cached(1).should.equal(1);
        calls.should.equal(2);
    });
    it('should combine synchronous / fast promise requests', function () {
        var calls = 0;
        var cached = cachify(function (n) {
            calls++;
            return Promise.resolve(n);
        });
        
        var foo = cached(123);
        cached(123).should.equal(foo);
        
        return cached(123).then(function (val) {
            val.should.equal(123);
            calls.should.equal(1);
        });
    });
    it('should delete rejected promises', function () {
        var calls = 0;
        var cached = cachify(function (n) {
            calls++;
            return Promise.reject(n);
        });
        
        var foo = cached(123);
        
        return foo.then(function () {
            throw new Error('expected foo to reject');
        }, function () {
            var bar = cached(123);
            bar.should.not.equal(foo);
            return bar.then(function () {
                throw new Error('Expected bar to reject');
            }, function () {
                calls.should.equal(2);
            });
        });
    });
    it('should key on all arguments by default', function () {
        var calls = 0;
        var cached = cachify(function () {
            calls++;
        });
        cached(1, 2);
        cached(1, 3);
        calls.should.equal(2);
    });
});
