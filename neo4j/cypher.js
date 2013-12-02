// neo4j cypher helper module


var neo4j = require('neo4j'),
    db = new neo4j.GraphDatabase(process.env.NEO4J_URL || 'http://localhost:7474'),
    _ = require('underscore')
;

function cleanResults (results) {

}

// Cypher
// for creating cypher queries and processing the results
// queryFn is takes in params and options and returns a callback with the cypher query
// resultsFn takes the results from a cypher query and does something and then callback
var Cypher = function (queryFn, resultsFn) {
  return function (params, options, callback) {
    queryFn(params, options, function (err, query, cypher_params) {
      if (err) {
        return callback(err, null, {
          query: query,
          params: cypher_params,
          err: err
        });
      }
      db.query(query, cypher_params, function (err, results) {
        if (err) {
          console.log(err);
          callback(err, null, {
            query: query,
            params: cypher_params,
            results: _cleanResults(results),
            err: err
          });
        } else if (!_.isFunction(resultsFn)) {
          callback(err, null, {
            query: query,
            params: cypher_params,
            results: _cleanResults(results)
          });
        } else {
          resultsFn(results, function (err, finalResults) {
            callback(err, finalResults, {
              query: query,
              params: cypher_params,
              results: _cleanResults(results)
            });
          });
        }
      });
    });
  };
};


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

// Cypher.where('user','name','userName').and('category','name','');

module.exports = Cypher;