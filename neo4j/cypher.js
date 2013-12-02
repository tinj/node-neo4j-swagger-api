// neo4j cypher helper module


var neo4j = require('neo4j'),
    db = new neo4j.GraphDatabase(process.env.NEO4J_URL || 'http://localhost:7474'),
    _ = require('underscore')
;

// Cypher
// for creating cypher queries and processing the results
// queryFn is takes in params and options and returns a callback with the cypher query
// resultsFn takes the results from a cypher query and does something and then callback
var Cypher = function (queryFn, resultsFn) {
  return function (params, options, callback) {
    queryFn(params, options, function (err, query, cypher_params) {
      if (err) {
        return callback(err);
      }
      db.query(query, cypher_params, function (err, results) {
        if (err) {
          console.log(err);
          callback(err);
        } else if (!_.isFunction(resultsFn)) {
          callback(err);
        } else {
          resultsFn(results, callback);
        }
      });
    });
  };
};


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