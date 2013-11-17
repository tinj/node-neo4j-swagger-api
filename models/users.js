// user.js
// User neo4j query logic.

var _ = require('underscore');
var uuid = require('uuid');
var cypher = require('../neo4j');
var User = require('../models/neo4j/user');

module.exports = (function () {

  /**
   *  Util Functions
   */

  var whereTemplate = _.template('user.<%= key %>={<%= key %>}');

  var _where = function (keys) {
    if (keys && keys.length) {
      return 'WHERE '+_.map(keys, function (key) {
        return whereTemplate({key: key});
      }).join(' AND ');
    }
  };


  /**
   *  Result Functions
   *  to be combined with queries using _.partial()
   */

  // return a single user
  var _singleUser = function (queryFn, params, options, callback) {
    queryFn(params, options, function (err, results) {
      if (err || !results.length) return callback(err);
      callback(null, new User(results[0].user));
    });
  };

  // return multiple users
  var _multipleUsers = function (queryFn, params, options, callback) {
    queryFn(params, options, function (err, results) {
      if (err) return callback(err);
      var users = _.map(results, function (result) {
        return new User(result.user);
      });

      callback(null, users);
    });
  };

  // returns a user and a friend
  var _singleUserWithFriend = function (queryFn, params, options, callback) {
    queryFn(params, options, function (err, results) {
      if (err || !results.length) return callback(err);
      callback(null, new User(results[0].user), new User(results[0].friend));
    });
  };

  /**
   *  Query Functions
   *  to be combined with result functions using _.partial()
   */


  var _matchBy = function (keys, params, options, callback) {
    var cypher_params = _.pick(params, keys);

    var query = [
      'MATCH (user:User)',
      _where(keys),
      'RETURN user'
    ].join('\n');

    cypher(query, cypher_params, callback);
  };

  var _matchByUUID = _.partial(_matchBy, ['uuid']);
  var _matchByName = _.partial(_matchBy, ['name']);
  var _matchAll = _.partial(_matchBy, []);


  var _updateName = function (params, options, callback) {
    var cypher_params = {
      uuid : params.uuid,
      name : params.name
    };

    var query = [
      'MATCH (user:User)',
      'WHERE user.uuid = {uuid}',
      'SET user.name = {name}',
      'RETURN user'
    ].join('\n');

    cypher(query, cypher_params, callback);
  };


  // creates the user with cypher
  var _create = function (params, options, callback) {
    var cypher_params = {
      uuid: params.uuid || uuid(),
      name: params.name
    };

    var query = [
      'MERGE (user:User {name: {name}, uuid: {uuid}})',
      'ON CREATE user',
      'SET user.created = timestamp()',
      'ON MATCH user',
      'SET user.lastLogin = timestamp()',
      'RETURN user'
    ].join('\n');

    cypher(query, cypher_params, callback);
  };

  // delete the user and any relationships with cypher
  var _delete = function (params, options, callback) {
    var cypher_params = {
      uuid: params.uuid
    };

    var query = [
      'MATCH (user:User)',
      'WHERE user.uuid={uuid}',
      'WITH user',
      'MATCH (user)-[r?]-()',
      'DELETE user, r',
    ].join('\n');
    cypher(query, cypher_params, callback);
  };


  // friend the user
  var _friend = function (params, options, callback) {
    var cypher_params = {
      uuid: params.uuid,
      friend: params.friend
    };

    var query = [
      'MATCH (user:User), (friend:User)',
      'WHERE user.uuid={uuid} AND friend.uuid={friend} AND NOT((user)-[:friend]-(friend))',
      'CREATE (user)-[:friend {created: timestamp()}]->(friend)',
      'RETURN user, friend'
    ].join('\n');
    cypher(query, cypher_params, callback);
  };

  // exposed functions

  return {
    getByUUID: _.partial(_singleUser, _matchByUUID),
    getByName: _.partial(_singleUser, _matchByName),
    updateName: _.partial(_singleUser, _updateName),
    create: _.partial(_singleUser, _create),
    login: _.partial(_singleUser, _create),
    getAll: _.partial(_multipleUsers, _matchAll),
    friendUser: _.partial(_singleUserWithFriend, _friend),
    deleteUser: _delete
  };

})();