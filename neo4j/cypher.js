// this needs to be pulled out as a separate module!


// basically these are a bunch of helper functions for cypher queries
// for outputting queries and results in the console (move to swagger client!!!)
// composing cypher queries
// query and result processing functions

// Helper functions relating to cypher for neo4j models.
module.exports = function () {
  var _ = require('underscore')
  , _m  = require('../underscore_mixins')
  , async = require('async')
  , moment = require('moment')
  , colors = require('colors')

  , Neo4j = require('./neo4j')
  ;

  // for neo4j queries using cypher
  var _query = function (query, params, options, callback) {
    var timer = options.timer ? moment() : false;
    options.date = params.DATE;
    _input(query, params, options);
    Neo4j.query(query, params, function (err, results) {
      if (err) {
        if (_(err.message).startsWith("Don't panic")) {
          var delay = _.random(10, 50);
          console.log('Caught a deadlock! Trying one more time in %d ms!'.cyan, delay);
          return setTimeout(Neo4j.query, delay, query, params, function (err, results) {
            if (err) _input(query, params, _.defaults({output: true}, options));
            callback(err, results, options);
          });
        }
        return callback(err); // should try again in case of deadlock but need to catch it
      }
      _results(results, options);
      if (timer) {
        console.log('Query time for %s.%s: %s'
                  , (options.model || 'model').toString().cyan
                  , (options.name || '').toString().green
                  , (moment().diff(timer, "seconds", true)+" seconds").red);
      }
      callback(err, results, options);
    });
  };

  var _colorValue = function (val) {
    if (_.isString(val)) {
      return ('"'+val+'"').yellow;
    } else if (_.isArray(val) || !_.isNumber(val)) {
      return JSON.stringify(val).yellow;
    } else {
      return val.toString().yellow;
    }
  };

  // displays and color codes the query and params if output is true, or {query: true}
  var _input = function (query, params, options) {
    var output = options.output || {};

    if (output === true || _.hasTrue(output, 'query')) {
      var cmds = [
        'START'
        ,'CREATE UNIQUE'
        ,'SET'
        ,'WITH'
        ,'MATCH'
        ,'WHERE'
        ,'CREATE'
        ,'MERGE'
        ,'REMOVE'
        ,'RETURN'
        ,'DELETE'
        ,'ORDER BY'
        ,'FOREACH'
        ,'LIMIT'
        ,'SKIP'
      ];
      // need to figure out the regex for these...
      // var arrows = [
      //   {r: /<-[//[]/,t:'<-['}
      //   ,{r:'/[->',t:']->'}
      //   ,{r:'<--',t:'<--'}
      //   ,{r:'-->',t:'-->'}
      //   ,{r:'[//]]-',t:'[//]]-'}
      //   ,{r:'-[//[]',t:'-['}
      //   ,{r:'--',t:'--'}
      // ];
      var fn = ['COALESCE','COLLECT','LENGTH','FILTER','ROUND','HAS','NOT','ID','DISTINCT','AND','IN'];
      var newParams = _.map(params, function (v, k) {
        if (!_.isUndefined(v)) {
          query = query.replace(new RegExp('\{'+k+'\}',"gi"), _colorValue(v));
          return k.green + ':'+(_colorValue(v));
        }
      });
      _.each(cmds, function (w) {
        query = query.replace(new RegExp('^'+w,"gm"), w.magenta);
      });
      _.each(fn, function (w) {
        query = query.replace(new RegExp(w+'[\s(]',"g"), w.cyan+'(');
      });
      // _.each(arrows, function (w){ query = query.replace(new RegExp(w.r,"g"), w.t.red); });
      _outputName(options);
      console.log("query = \n%s", query);
      console.log("params = {%s}", newParams.join(', '));
    } else if (output.name) {
      // displays only the name of the model and functions
      _outputName(options);
    } else if (output.queryObject) {
      console.log('%j', {query:query, params:params});
    }
  };

  var _outputName = function (options) {
    var name = options.name || 'unspecified function'
    , modelName = (options.model || 'unspecified model').toString().cyan.bold
    , optionsFn = options.fn || 'unspecified fn'
    ;
    console.log('%s - %s:%s - %s'
                , modelName
                , 'fn'.yellow
                , optionsFn.yellow
                , name.green.underline);
  };

  // show the stringified results of a cypher query
  var _results = function (results, options) {
    var output = options.output || options
    , modelName = (options.model || 'model').toString().cyan.bold
    , fnName = (options.name || 'fn').toString().green.underline
    ;
    if (output === true || _._hasTrue(output, 'results')) {
      _cleanResults(results, function (res) {
        console.log('%s.%s.%s = %s', modelName, fnName, 'results'.magenta, res);
      });
    } else if (_.hasTrue(output, 'res')) {
      // to show whether results contains anything
      console.log('%s.%s.%s = %d', modelName, fnName, 'results.length'.magenta, results.length);
    }
  };

  var _hasData = function (value) {
    return _.hasTrue(value, '_data');
  };

  var _cleanArray = function (memo, value) {
    if (_hasData(value)) {
      return memo.concat(value._data.data);
    } else if (_.isArray(value)) {
      return memo.concat(_.reduce(value, _cleanArray, []));
    } else {
      return memo.concat(value);
    }
  };

  var _cleanObject = function (memo, value, key) {
    if (_hasData(value)) {
      memo[key] = value._data.data;
    } else if (_.isArray(value)) {
      memo[key] = _.reduce(value, _cleanArray, []);
    } else {
      memo[key] = value;
    }
    return memo;
  };

  var _cleanResults = function (results, callback) {
    var clean = _.map(results, function (res) {
      return _.reduce(res, _cleanObject, {});
    });
    clean = JSON.stringify(clean, '', '  ');
    callback(clean);
  };

  // delete nodes and their relationships by array of node ids
  var _forceDelete = function (node_ids, options, callback) {
    if (!_.isNumber(node_ids) && !(_.isArray(node_ids) && node_ids.length && _.every(node_ids, _.isNumber))) {
      return callback();
    }
    options.name = 'forceDelete';
    var cypher_params = {
      NODE_IDS : node_ids
    };
    var cypher_query = [
      'START n = node({NODE_IDS})'
    , 'MATCH n-[r?]-()'
    , 'DELETE n, r'
    ].join('\n');
    _query(cypher_query, cypher_params, options, callback);
  };

  // 5 arguments
  var _checkQueryAndResults = function (name, errorFn, errorOptions, queryFn, resultFn) {
    return function (params, options, callback) {
      options.name = name;
      async.waterfall([
        _.partial(errorFn, params, errorOptions)
        , _.partial(queryFn, params, options)
        , resultFn
      ], callback);
    };
  };

  // 4 arguments
  var _paramsQueryAndResults = function (name, newParams, queryFn, resultFn) {
    return function (params, options, callback) {
      options.name = name;
      async.waterfall([
        _.partial(queryFn, newParams, options)
        , resultFn
      ], callback);
    };
  };

  // 3 arguments
  var _queryAndResults = function (name, queryFn, resultFn) {
    return function (params, options, callback) {
      options.name = name;
      async.waterfall([
        _.partial(queryFn, params, options)
        , resultFn
      ], callback);
    };
  };

  // combines multiple functions together to run a cypher query and then process the results
  var _compose = function () {
    var args = Array.prototype.slice.call(arguments);
    if (!_.isString(args[0])) {
      args = ['unspecified'].concat(args);
    }
    if (args.length === 5) {
      return _checkQueryAndResults.apply(null, args);
    } else if (args.length === 4) {
      return _paramsQueryAndResults.apply(null, args);
    } else if (args.length === 3) {
      return _queryAndResults.apply(null, args);
    } else {
      return _queryAndResults.apply(null, args);
    }
  };

  return {
    query : _query
    , input : _input
    , results : _results
    , cleanResults : _cleanResults
    , forceDelete : _forceDelete
    , compose : _compose
  };
}();