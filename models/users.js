/**
 *  neo4j user functions
 *  these are mostly written in a functional style
 */


var _ = require('underscore');
var uuid = require('uuid');
var cypher = require('../neo4j');
var User = require('../models/neo4j/user');

module.exports = (function () {

  /**
   *  Util Functions
   */

  // for creating cypher queries and processing the results
  function Cypher (queryFn, resultsFn) {
    return function (params, options, callback) {
      queryFn(params, options, function (err, query, cypher_params) {
        if (err) return callback(err);
        cypher(query, cypher_params, function (err, results) {
          if (err || !results.length || !_.isFunction(resultsFn)) return callback(err);
          resultsFn(results, callback);
        });
      });
    };
  }

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
  var _singleUser = function (results, callback) {
    callback(null, new User(results[0].user));
  };

  // return multiple users
  var _multipleUsers = function (results, callback) {
    var users = _.map(results, function (result) {
      return new User(result.user);
    });

    callback(null, users);
  };

  // returns a user and a friend
  var _singleUserWithFriend = function (results, callback) {
    callback(null, new User(results[0].user), new User(results[0].friend));
  };

  // returns a user and their friends
  var _singleUserWithFriends = function (results, callback) {
    var user = new User(results[0].user)
    var friends = _.map(results[0].friends, function (friend) {
      return new User(friend);
    });
    user.friends(friends);
    callback(null, user);
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

    callback(null, query, cypher_params);
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

    callback(null, query, cypher_params);
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

    callback(null, query, cypher_params);
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
    callback(null, query, cypher_params);
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
    callback(null, query, cypher_params);
  };

  // unfriend the user
  var _unfriend = function (params, options, callback) {
    var cypher_params = {
      uuid: params.uuid,
      friend: params.friend
    };

    var query = [
      'MATCH (user:User)-[r:friend]-(friend:User)',
      'WHERE user.uuid={uuid} AND friend.uuid={friend}',
      'DELETE r',
      'RETURN user, friend'
    ].join('\n');
    callback(null, query, cypher_params);
  };

  // match with friends
  var _matchWithFriends = function (params, options, callback) {
    var cypher_params = {
      uuid: params.uuid
    };

    var query = [
      'MATCH (user:User)',
      'WHERE user.uuid={uuid}',
      'WITH user',
      'MATCH (user)-[r?:friend]-(friend:User)',
      'RETURN user, COLLECT(friend) as friends'
    ].join('\n');
    callback(null, query, cypher_params);
  };




  // exposed functions

  return {
    getByUUID: Cypher(_matchByUUID, _singleUser),
    getByName: Cypher(_matchByName, _singleUser),
    updateName: Cypher(_updateName, _singleUser),
    create: Cypher(_create, _singleUser),
    login: Cypher(_create, _singleUser),
    getAll: Cypher(_matchAll, _multipleUsers),
    friendUser: Cypher(_friend, _singleUserWithFriend),
    unfriendUser: Cypher(_unfriend, _singleUserWithFriend),
    deleteUser: Cypher(_delete),
    getWithFriends: Cypher(_matchWithFriends, _singleUserWithFriends)
  };

})();