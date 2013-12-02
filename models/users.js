/**
 *  neo4j user functions
 *  these are mostly written in a functional style
 */


var _ = require('underscore');
var uuid = require('hat'); // generates uuids
var Cypher = require('../neo4j/cypher');
var User = require('../models/neo4j/user');
var async = require('async');
var randomName = require('random-name');


/*
 *  Utility Functions
 */

function _randomName () {
  return randomName.first() + ' ' + randomName.last();
}

function _randomNames (n) {
  return _.times(n, _randomName);
}


/**
 *  Result Functions
 *  to be combined with queries using _.partial()
 */

// return a single user
var _singleUser = function (results, callback) {
  if (results.length) {
    callback(null, new User(results[0].user));
  } else {
    callback(null, null);
  }
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
  if (!results.length) return callback();
  callback(null, {
    user: new User(results[0].user),
    friend: new User(results[0].friend)
  });
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

var _matchByUUID = _.partial(_matchBy, ['id']);
var _matchByName = _.partial(_matchBy, ['name']);
var _matchAll = _.partial(_matchBy, []);


var _updateName = function (params, options, callback) {
  var cypher_params = {
    id : params.id,
    name : params.name
  };

  var query = [
    'MATCH (user:User {id:{id}})',
    'SET user.name = {name}',
    'RETURN user'
  ].join('\n');

  callback(null, query, cypher_params);
};

// creates the user with cypher
var _create = function (params, options, callback) {
  var cypher_params = {
    id: params.id || uuid(),
    name: params.name
  };

  var query = [
    'MERGE (user:User {name: {name}, id: {id}})',
    'ON CREATE',
    'SET user.created = timestamp()',
    'ON MATCH',
    'SET user.lastLogin = timestamp()',
    'RETURN user'
  ].join('\n');

  callback(null, query, cypher_params);
};

// creates many users with cypher
var _createMany = function (params, options, callback) {
  var users = _.map(params.users, function (user) {
    return {
      id: user.id || uuid(),
      name: user.name
    };
  });

  var cypher_params = {
    users: users
  };

  var query = [
    'MERGE (user:User {name: {users}.name, id: {users}.id})',
    'ON CREATE',
    'SET user.created = timestamp()',
    'ON MATCH',
    'SET user.lastLogin = timestamp()',
    'RETURN user'
  ].join('\n');
  console.log(users);
  console.log(query);

  callback(null, query, cypher_params);
};

// delete the user and any relationships with cypher
var _delete = function (params, options, callback) {
  var cypher_params = {
    id: params.id
  };

  var query = [
    'MATCH (user:User {id:{id}})',
    'OPTIONAL MATCH (user)-[r]-()',
    'DELETE user, r',
  ].join('\n');
  callback(null, query, cypher_params);
};

// delete all users
var _deleteAll = function (params, options, callback) {
  var cypher_params = {};

  var query = [
    'MATCH (user:User)',
    'OPTIONAL MATCH (user)-[r]-()',
    'DELETE user, r',
  ].join('\n');
  callback(null, query, cypher_params);
};


// friend the user
var _friend = function (params, options, callback) {
  var cypher_params = {
    id: params.id,
    friend_id: params.friend_id
  };

  var query = [
    'MATCH (user:User {id:{id}}), (friend:User {id:{friend_id}})',
    'WHERE NOT((user)-[:friend]-(friend))',
    'CREATE (user)-[:friend {created: timestamp()}]->(friend)',
    'RETURN user, friend'
  ].join('\n');
  callback(null, query, cypher_params);
};

// friend random user
var _friendRandom = function (params, options, callback) {
  var cypher_params = {
    id: params.id
  };

  var query = [
    'MATCH (user:User {id:{id}}), (friend:User)',
    'WHERE NOT((user)-[:friend]-(friend))',
    'WITH user, friend, rand() as rnd',
    'ORDER BY rnd',
    'LIMIT 1',
    'CREATE (user)-[:friend {created: timestamp()}]->(friend)',
    'RETURN user, friend'
  ].join('\n');
  callback(null, query, cypher_params);
};

// unfriend the user
var _unfriend = function (params, options, callback) {
  var cypher_params = {
    id: params.id,
    friend_id: params.friend_id
  };

  var query = [
    'MATCH (user:User {id:{id}})-[r:friend]-(friend:User {id:{friend_id}})',
    'DELETE r',
    'RETURN user, friend'
  ].join('\n');
  callback(null, query, cypher_params);
};

// match with friends
var _matchWithFriends = function (params, options, callback) {
  var cypher_params = {
    id: params.id
  };

  var query = [
    'MATCH (user:User {id:{id}})',
    'OPTIONAL MATCH (user)-[r:friend]-(friend:User)',
    'RETURN user, COLLECT(friend) as friends'
  ].join('\n');
  callback(null, query, cypher_params);
};


// match all with friends
var _matchAllWithFriends = function (params, options, callback) {
  var cypher_params = {};

  var query = [
    'MATCH (user:User)',
    'OPTIONAL MATCH (user)-[r:friend]-(friend:User)',
    'RETURN user, COLLECT(friend) as friends'
  ].join('\n');
  callback(null, query, cypher_params);
};



// exposed functions


// get a single user by id
var getById = Cypher(_matchByUUID, _singleUser);

// get a single user by name
var getByName = Cypher(_matchByName, _singleUser);

// get a user by id and update their name
var updateName = Cypher(_updateName, _singleUser);

// create a new user
var create = Cypher(_create, _singleUser);

// create many new users
var createMany = function (params, options, callback) {
  if (params.names && _.isArray(params.names)) {
    async.map(params.names, function (name, callback) {
      create({name: name}, null, callback);
    }, callback);
  } else if (params.users && _.isArray(params.users)) {
    async.map(params.users, function (user, callback) {
      create(_.pick(user, 'name', 'id'), null, callback);
    }, callback);
  } else {
    callback(null, []);
  }
};

var createRandom = function (params, options, callback) {
  var names = _randomNames(params.n || 1);
  createMany({names: names}, options, callback);
};

// login a user
var login = create;

// get all users
var getAll = Cypher(_matchAll, _manyUsers);

// friend a user by id
var friendUser = Cypher(_friend, _singleUserWithFriend);

// friend a random user
var friendRandomUser = Cypher(_friendRandom, _singleUserWithFriend);

// unfriend a user by id
var unfriendUser = Cypher(_unfriend, _singleUserWithFriend);

// delete a user by id
var deleteUser = Cypher(_delete);

// delete a user by id
var deleteAllUsers = Cypher(_deleteAll);

// get a single user by id and all friends
var getWithFriends = Cypher(_matchWithFriends, _singleUserWithFriends);

// get all users and all friends
var getAllWithFriends = Cypher(_matchAllWithFriends, _manyUsersWithFriends);



// export exposed functions

module.exports = {
  getById: getById,
  getByName: getByName,
  updateName: updateName,
  create: create,
  createMany: createMany,
  createRandom: createRandom,
  login: login,
  getAll: getAll,
  friendUser: friendUser,
  friendRandomUser: friendRandomUser,
  unfriendUser: unfriendUser,
  deleteUser: deleteUser,
  deleteAllUsers: deleteAllUsers,
  getWithFriends: getWithFriends,
  getAllWithFriends: getAllWithFriends
};