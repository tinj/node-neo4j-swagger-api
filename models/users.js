/**
 *  neo4j user functions
 *  these are mostly written in a functional style
 */


var _ = require('underscore');
var uuid = require('uuid');
var Cypher = require('../neo4j/cypher');
var User = require('../models/neo4j/user');


/**
 *  Result Functions
 *  to be combined with queries using _.partial()
 */

// return a single user
var _singleUser = function (results, callback) {
  callback(null, new User(results[0].user));
};

// return many users
var _manyUsers = function (results, callback) {
  var users = _.map(results, function (result) {
    return new User(result.user);
  });

  callback(null, users);
};

// returns a user and a friend
var _singleUserWithFriend = function (results, callback) {
  callback(null, new User(results[0].user), new User(results[0].friend));
};

// returns a user and their friends from a cypher result
var _parseUserWithFriends = function (result) {
  var user = new User(result.user);
  var friends = _.map(result.friends, function (friend) {
    return new User(friend);
  });
  user.friends(friends);
  return user;
};

// returns a user and their friends
var _singleUserWithFriends = function (results, callback) {
  callback(null, _parseUserWithFriends(results[0]));
};

// returns many users and their friends
var _manyUsersWithFriends = function (results, callback) {
  var users = _.map(results, _parseUserWithFriends);
  callback(null, users);
};

/**
 *  Query Functions
 *  to be combined with result functions using _.partial()
 */


var _matchBy = function (keys, params, options, callback) {
  var cypher_params = _.pick(params, keys);

  var query = [
    'MATCH (user:User)',
    Cypher.where('user', keys),
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


// match all with friends
var _matchAllWithFriends = function (params, options, callback) {
  var cypher_params = {};

  var query = [
    'MATCH (user:User)',
    'WITH user',
    'MATCH (user)-[r?:friend]-(friend:User)',
    'RETURN user, COLLECT(friend) as friends'
  ].join('\n');
  callback(null, query, cypher_params);
};



// exposed functions

module.exports = {
  // get a single user by uuid
  getByUUID: Cypher(_matchByUUID, _singleUser),

  // get a single user by name
  getByName: Cypher(_matchByName, _singleUser),

  // get a user by uuid and update their name
  updateName: Cypher(_updateName, _singleUser),

  // create a new user
  create: Cypher(_create, _singleUser),

  // login a user
  login: Cypher(_create, _singleUser),

  // get all users
  getAll: Cypher(_matchAll, _manyUsers),

  // friend a user by uuid
  friendUser: Cypher(_friend, _singleUserWithFriend),

  // unfriend a user by uuid
  unfriendUser: Cypher(_unfriend, _singleUserWithFriend),

  // delete a user by uuid
  deleteUser: Cypher(_delete),

  // get a single user by uuid and all friends
  getWithFriends: Cypher(_matchWithFriends, _singleUserWithFriends),

  // get all users and all friends
  getAllWithFriends: Cypher(_matchAllWithFriends, _manyUsersWithFriends)
};