# lru-cachify

Purpose: easily wrap a function to provide caching. Inspired by [memoizee](http://www.npmjs.com/package/memoizee), but simpler in some ways and with some extra / different functionality. Uses [lru-cache](http://www.npmjs.com/package/lru-cache) for the caching functionality itself.

# Usage

    var cachify = require('lru-cachify');
    var getThings = cachify(function () {
        return { };
    });

    getThings('foo') === getThings('foo');
    getThings('foo') !== getThings('bar');

# Options
You can pass lru-cache options as an optional first argument

    var getThings = cachify({
        max: 1        
    }, function () {
        return { };
    });

    var foo = getThings('foo'),
		bar = getThings('bar');

    getThings('bar') === bar;
    getThings('foo') !== foo;

In addition to this, lru-cachify provides three options of its own:

- normalize: a function to normalize the options before constructing the cache key
- length: the number of arguments to use in constructing the cache key
- key: a function that returns the cache key, given the normalized (and possibly truncated) arguments

Example:

    var getThings = cachify({
        normalize: function (a, b, c) {
            // allow passing of an array or separate arguments
            if (Array.isArray(a)) { return a; }
            return [a, b, c];
        },
        key: function (a, b) {
            return a + b;
        },
        length: 2
    }, function (a, b, c) {
        return a * b + c;         
    });

    getThings(2, 3, 4) === 10;
    getThings(3, 2, 4) === 10; // 3 + 2 === 2 + 3, so the key is the same
    getThings(2, 3, 5) === 10; // length is 2, so the third argument is ignored when constructing the key

# LRU Methods
Public methods of LRU instances are assigned to the returned function, so you can do things like peek or reset the cache:

    var count = 0;
    var getCount = cachify(function () { return ++count; });
    
    getCount() === 1;
    getCount() === 1;
    getCount.reset();
    getCount() === 2;     

# Promises
The promise itself is cached, but deleted if it rejects. Because of this, multiple equivalent synchronous calls will be combined into a single promise, reducing database or api overhead:

    var getThings = cachify(function (id) {
        return db.queryAsync('SELECT name FROM people WHERE id = $1', [ id ]);
    });

    var foo = getThings(1),
        bar = getThings(1);

    foo === bar;
    foo.then(function (val) {
        val === 'Bob'; // assuming people has a record with {id: 1, name: 'Bob'}
    });

Rejections will be batched in the same manner as a result of this behavior:

    var rejections = 0;
    var getThings = cachify(function (id) {
        return Promise.reject(++rejections);
    });

    var foo = getThings(1),
        bar = getThings(1);

    foo === bar;

    foo.then(null, function (err) {
        err === 1;
    });
    bar.then(null, function (err) {
        err === 2;
    });

The difference is shown here:

    var succeed = cachify(function () {
        return Promise.resolve('yes');
    });
    var fail = cachify(function () {
        return Promise.reject('no');
    });
    
    var foo = succeed();
    foo.then(function () {
        succeed() === foo;
    });

    var bar = fail();
    bar.then(function () {
        fail() !== bar;
    });

There is currently no similar handling for callback APIs.
