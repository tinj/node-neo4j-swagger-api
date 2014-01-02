// neo4j cypher helper module

var neo4j = require('neo4j'),
    db = new neo4j.GraphDatabase(process.env.NEO4J_URL || 'http://localhost:7474'),
    _ = require('underscore'),
    async = require('async')
;

/* Cypher
 *
 * chainable
 *
 * queryFn : takes in params and options and returns a callback with the cypher query
 *
 * resultsFn : takes the results from a cypher query and does something and then callback
 *
 * db.query : executes a cypher query to neo4j
 *
 * formatResponse : structures the results based on options param
 */


var Cypher = function () {

  this.init = function () {
    var args = Array.prototype.slice.call(arguments);
    this._cypher = true;
    this._sequence = [];
    if (args.length == 2) {
      this.query(args[0]);
      this.results(args[1]);
    } else if (args.length == 1) {
      this.query(args[0]);
    }
  };

  this._add = function (fn) {
    // console.log(fn);
    this._sequence.push(fn);
    return this;
  };

  this._async = function (name, fn) {
    this._add(function (arr, callback) {
      async[name](arr, fn, callback);
    });
  };

  // constructor functions
  this.query = function (fn) {
    if (!_.isFunction(fn)) {
      throw new Error('Not a function');
    }
    this._add(fn);
    this._add('query');
    return this;
  };

  this.results = function (fn) {
    if (!_.isFunction(fn)) {
      throw new Error('Not a function');
    }
    return this._add(fn);
  };

  this.setup = function (fn, initParams) {
    if (!_.isFunction(fn)) {
      throw new Error('Not a function');
    }
    if (initParams) {
      return this._add({
        params: true,
        fn: fn
      });
    } else {
      return this._add(fn);
    }
  };

  this.params = function () {
    return this._add('params');
  };

  this.cypher = function (fn) {
    if (!fn._cypher) {
      throw new Error('Not a Cypher function');
    }
    return this._add(fn);
  };

  function _setAsync (that) {
    function _async (name, fn) {
      return this._add({
        async: name,
        fn: fn
      });
    }
    _.each(['map', 'mapSeries'], function (name) {
      that[name] = _.partial(_async, name);
    });
  }
  _setAsync(this);

  this.exp = function (_sequence, params, options, callback) {
    // console.log('exp');
    var neo4jResponse = options.neo4j;
    var queries = neo4jResponse ? [] : null;
    var _query = function (query, params, callback) {
      // console.log('_query');
      db.query(query, params, function (err, results) {
        if (queries) {
          queries.push({
            query: query,
            params: params,
            results: _cleanResults(results)
          });
          // console.log(_.last(queries));
        }
        callback(err, results);
      });
    };

    // pass in original params
    var _params = function () {
      var callback = arguments[arguments.length - 1];
      callback(null, params);
    };

    // run and extract queries from another Cypher
    var _cypher = function (fn, params, callback) {
      fn.fn()(params, options, function (err, results, theseQueries) {
        if (queries && theseQueries && theseQueries.length) {
          queries.push.apply(queries, theseQueries);
        }
        callback(err, results);
      });
    };

    // run attached fn using an async function (e.g. 'map')
    var _async = function (name, fn, params, callback) {
      if (fn._cypher) {
        async[name](params, _.partial(_cypher, fn), callback);
      } else {
        async[name](params, fn, callback);
      }
    };

    // pass in initial params
    var _init = function (callback) {
      callback(null, params);
    };

    // console.log(_sequence.length);
    var sequence = [_init].concat(_.map(_sequence, function (fn) {
      if (_.isFunction(fn)) {
        return fn;
      } else if ('query' == fn) {
        return _query;
      } else if ('params' == fn) {
        return _params;
      } else if (fn._cypher) {
        return _.partial(_cypher, fn);
      } else if (_.isObject(fn)) {
        if (_.isString(fn.async) && fn.fn) {
          return _.partial(_async, fn.async, fn.fn);
        } else if (fn.params && fn.fn) {
          return _.partial(fn.fn, params);
        }
      }
    }));

    // console.log(that._sequence);
    // console.log(sequence);
    async.waterfall(sequence, function (err, results) {
      callback(err, results, queries);
    });
  };

  this.fn = function () {
    // pass in the fn sequence
    return _.partial(this.exp, this._sequence);
  };

  this.init.apply(this, arguments);

  return this;
};



/*
 *  Neo4j results cleaning functions
 *  strips RESTful data from cypher results
 */

// creates a clean results which removes all non _data properties from nodes/rels
function _cleanResults (results, stringify) {
  var clean = _.map(results, function (res) {
    return _.reduce(res, _cleanObject, {});
  });
  if (stringify) return JSON.stringify(clean, '', '  ');
  return clean;
}

// copies only the data from nodes/rels to a new object
function _cleanObject (memo, value, key) {
  if (_hasData(value)) {
    memo[key] = value._data.data;
  } else if (_.isArray(value)) {
    memo[key] = _.reduce(value, _cleanArray, []);
  } else {
    memo[key] = value;
  }
  return memo;
}

// cleans an array of nodes/rels
function _cleanArray (memo, value) {
  if (_hasData(value)) {
    return memo.concat(value._data.data);
  } else if (_.isArray(value)) {
    return memo.concat(_.reduce(value, _cleanArray, []));
  } else {
    return memo.concat(value);
  }
}

function _hasData (value) {
  return _.isObject(value) && value._data;
}


/**
 *  Util Functions
 */

var _whereTemplate = function (name, key, paramKey) {
  return name +'.'+key+'={'+(paramKey || key)+'}';
};



/**
 *  Cypher Query Helper Functions
 */

Cypher.where = function (name, keys) {
  if (_.isArray(name)) {
    _.map(name, function (obj) {
      return _whereTemplate(obj.name, obj.key, obj.paramKey);
    });
  } else if (keys && keys.length) {
    return 'WHERE '+_.map(keys, function (key) {
      return _whereTemplate(name, key);
    }).join(' AND ');
  }
};


module.exports = Cypher;