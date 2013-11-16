// user.js
// User neo4j query logic.

var _ = require('underscore');
var uuid = require('uuid');
var cypher = require('../neo4j');
var User = require('../models/neo4j/user');

module.exports = (function () {

  // util functions
  // var tmpl = _.template('user.<%= key %>={<%= key %>}');
  function whereMatch (type, params, join) {
    return _.map(_.keys(input_params), function (key) {
      return type+'.'+key+'={'+key+'}';
    }).join(' '+join+' ');
  }


  var _get = function (uuid, callback) {
    var params = {
      uuid : uuid
    };

    var query = [
      'MATCH (user:User)',
      'WHERE user.uuid = {uuid}',
      'RETURN user'
    ].join('\n');

    cypher(query, params, function (err, results) {
      if (err || !results.length) return callback(err);
      // console.log(results);
      callback(null, new User(results[0].user));
    });
  };

  var _search = function (input_params, callback) {
    var params = {
      uuid : input_params.uuid,
      name : input_params.name
    };

    var query = [
      'MATCH (user:User)',
      'WHERE '+ whereMatch('user', input_params, 'AND'),
      'RETURN user'
    ].join('\n');

    cypher(query, params, function (err, results) {
      if (err || !results.length) return callback(err);
      // console.log(results);
      callback(null, new User(results[0].user));
      var users = _.map(results, function (node) {
        return new User(node.user);
      });

      if (users.length === 1) {
        callback(null, users[0]);
      } else {
        callback(null, users);
      }
    });
  };

  var _getAll = function (callback) {
    var params = {};

    var query = [
      'MATCH (user:User)',
      'RETURN user'
    ].join('\n');

    cypher(query, params, function (err, results) {
      if (err) return callback(null, []);
      var users = _.map(results, function (node) {
        return new User(node.user);
      });

      callback(null, users);
    });
  };

  // creates the user with cypher
  var _create = function (data, callback) {
    var params = {
      // uid : data.uid,
      uuid: uuid(),
      name: data.name
    };

    var query = [
      'MERGE (user:User {name: {name}})',
      'ON CREATE user',
      'SET user.created = timestamp(), user.uuid={uuid}',
      'ON MATCH user',
      'SET user.lastLogin = timestamp()',
      'RETURN user'
    ].join('\n');
    // console.log(params);
    // console.log(query);

    cypher(query, params, function (err, results) {
      if (err || !results.length) return callback(err);
      // console.log(JSON.stringify(results));
      var user = new User(results[0].user);
      // console.log(user);
      callback(null, user);
    });
  };

  // creates the user with cypher
  var _delete = function (uuid, callback) {
    var params = {
      uuid: uuid
    };

    var query = [
      'MATCH (user:User)',
      'WHERE user.uuid={uuid}',
      'WITH user',
      'MATCH (user)-[r?]-()',
      'DELETE user, r',
    ].join('\n');
    cypher(query, params, callback);
  };

  // exposed functions

  return {
    get: _get,
    create: _create,
    login: _create,
    getAll: _getAll,
    deleteUser: _delete
  };

})();