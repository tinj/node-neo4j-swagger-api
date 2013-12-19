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

// returns a user and their friends and friends of friends
var _singleUserWithFriendsAndFOF = function (results, callback) {
  if (!results.length) return callback();

  var user = new User(results[0].user);
  user.friends = _.chain(results).map(function (result) {
    if (result.friend) {
      var friend = new User(result.friend);
      friend.friends = _.map(result.fofs, function (fof) {
        return new User(fof);
      });
      return friend;
    }
  }).compact().value();
  callback(null, user);
};

// returns a user and their friends of friends
var _singleUserWithFOF = function (results, callback) {
  if (!results.length) return callback();

  var user = new User(results[0].user);
  user.fof = _.map(results[0].fofs, function (fof) {
    return new User(fof);
  });
  callback(null, user);
};

// returns many users and their friends
var _manyUsersWithFriends = function (results, callback) {
  var users = _.map(results, _parseUserWithFriends);
  callback(null, users);
};

// return a count
var _singleCount = function (results, callback) {
  if (results.length) {
    callback(null, {
      count: results[0].c || 0
    });
  } else {
    callback(null, null);
  }
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

// gets n random users
var _getRandom = function (params, options, callback) {
  var cypher_params = {
    n: parseInt(params.n || 1)
  };

  var query = [
    'MATCH (user:User)',
    'RETURN user, rand() as rnd',
    'ORDER BY rnd',
    'LIMIT {n}'
  ].join('\n');

  callback(null, query, cypher_params);
};

// gets n random users with friends
var _getRandomWithFriends = function (params, options, callback) {
  var cypher_params = {
    n: parseInt(params.n || 1)
  };

  var query = [
    'MATCH (user:User)',
    'WITH user, rand() as rnd',
    'ORDER BY rnd',
    'LIMIT {n}',
    'OPTIONAL MATCH (user)-[r:friend]-(friend:User)',
    'RETURN user, COLLECT(friend) as friends'
  ].join('\n');

  callback(null, query, cypher_params);
};


var _getAllCount = function (params, options, callback) {
  var cypher_params = {};

  var query = [
    'MATCH (user:User)',
    'RETURN COUNT(user) as c'
  ].join('\n');

  callback(null, query, cypher_params);
};

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
// var _createMany = function (params, options, callback) {
//   var users = _.map(params.users, function (user) {
//     return {
//       id: user.id || uuid(),
//       name: user.name
//     };
//   });

//   var cypher_params = {
//     users: users
//   };

//   var query = [
//     'MERGE (user:User {name: {users}.name, id: {users}.id})',
//     'ON CREATE',
//     'SET user.created = timestamp()',
//     'ON MATCH',
//     'SET user.lastLogin = timestamp()',
//     'RETURN user'
//   ].join('\n');

//   callback(null, query, cypher_params);
// };

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
    'WHERE NOT((user)-[:friend]-(friend)) AND NOT(user = friend)',
    'CREATE (user)-[:friend {created: timestamp()}]->(friend)',
    'RETURN user, friend'
  ].join('\n');
  callback(null, query, cypher_params);
};

// friend random user
var _friendRandom = function (params, options, callback) {
  var cypher_params = {
    id: params.id,
    n: params.n
  };

  var query = [
    'MATCH (user:User {id:{id}}), (friend:User)',
    'WHERE NOT((user)-[:friend]-(friend)) AND NOT(user = friend)',
    'WITH user, friend, rand() as rnd',
    'ORDER BY rnd',
    'LIMIT {n}',
    'CREATE (user)-[:friend {created: timestamp()}]->(friend)',
    'RETURN user, COLLECT(friend) as friends'
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

// match with friends and friends of friends (FOF)
var _matchWithFriendsAndFOF = function (params, options, callback) {
  var cypher_params = {
    id: params.id
  };

  var query = [
    'MATCH (user:User {id:{id}})',
    'OPTIONAL MATCH (user)-[:friend]-(friend:User)',
    'OPTIONAL MATCH (friend:User)-[:friend]-(fof:User)',
    'WHERE NOT(user=fof)',
    'RETURN user, friend, COLLECT(fof) as fofs'
  ].join('\n');
  callback(null, query, cypher_params);
};

// match with friends of friends (FOF)
var _matchWithFOF = function (params, options, callback) {
  var cypher_params = {
    id: params.id
  };

  var query = [
    'MATCH (user:User {id:{id}})',
    'OPTIONAL MATCH (user)-[:friend]-(friend:User)',
    'OPTIONAL MATCH (friend:User)-[:friend]-(fof:User)',
    'WHERE NOT(user=fof)',
    'RETURN user, COLLECT(DISTINCT fof) as fofs'
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

// get n random users
var getRandom = Cypher(_getRandom, _manyUsers);

// get n random users
var getRandomWithFriends = Cypher(_getRandomWithFriends, _manyUsersWithFriends);

// get a user by id and update their name
var updateName = Cypher(_updateName, _singleUser);

// create a new user
var create = Cypher(_create, _singleUser);

// create many new users
var createMany = function (params, options, callback) {
  if (params.names && _.isArray(params.names)) {
    async.map(params.names, function (name, callback) {
      create({name: name}, options, callback);
    }, function (err, responses) {
      Cypher.mergeReponses(err, responses, callback);
    });
  } else if (params.users && _.isArray(params.users)) {
    async.map(params.users, function (user, callback) {
      create(_.pick(user, 'name', 'id'), options, callback);
    }, function (err, responses) {
      Cypher.mergeReponses(err, responses, callback);
    });
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

// get all users count
var getAllCount = Cypher(_getAllCount, _singleCount);

// friend a user by id
var friendUser = Cypher(_friend, _singleUserWithFriend);

// friend random users
var friendRandomUser = Cypher(_friendRandom, _singleUserWithFriends);

// creates n new friendships between users
var manyFriendships = function (params, options, callback) {
  // number of friendships to create
  var friendships = parseInt(params.friendships || params.n || 1, 10);

  // user params
  var users = _.map(params.users, function (user) {
    return {
      id: user.id || user,
      n: 0
    };
  });
  var length = users.length;

  // randomly distribute friendships between users
  while (length && friendships>0) {
    friendships--;
    users[Math.floor(Math.random()*length)].n++;
  }

  users = _.filter(users, function (user) {
    return user.n > 0;
  });

  // this should be syncronous if we want to ensure no duplicates/deadlocks
  async.mapSeries(users, function (user, callback) {
    friendRandomUser(user, options, callback);
  }, function (err, responses) {
    Cypher.mergeReponses(err, responses, callback);
  });
};

// creates many friendships between random users
var manyRandomFriendships = function (params, options, callback) {
  getRandom(params, options, function (err, response) {
    if (err) return callback(err, response);
    manyFriendships({
      users: response.results,
      friendships: params.friendships || params.n
    }, options, function (err, finalResponse) {
      Cypher.mergeRaws(err, [response, finalResponse], callback);
    });
  });
};

// unfriend a user by id
var unfriendUser = Cypher(_unfriend, _singleUserWithFriend);

// delete a user by id
var deleteUser = Cypher(_delete);

// delete a user by id
var deleteAllUsers = Cypher(_deleteAll);

// reset all users
var resetUsers = function (params, options, callback) {
  deleteAllUsers(null, options, function (err, response) {
    if (err) return callback(err, response);
    createRandom(params, options, function (err, secondResponse) {
      if (err) return Cypher.mergeRaws(err, [response, secondResponse], callback);
      manyFriendships({
        users: secondResponse.results,
        friendships: params.friendships
      }, options, function (err, finalResponse) {
        // this doesn't return all the users, just the ones with friends
        Cypher.mergeRaws(err, [response, secondResponse, finalResponse], callback);
      });
    });
  });
};

// get a single user by id and all friends
var getWithFriends = Cypher(_matchWithFriends, _singleUserWithFriends);

// get a single user by id and all friends and friends of friends
var getWithFriendsAndFOF = Cypher(_matchWithFriendsAndFOF, _singleUserWithFriendsAndFOF);

// get a single user by id and all friends of friends
var getWithFOF = Cypher(_matchWithFOF, _singleUserWithFOF);

// get all users and all friends
var getAllWithFriends = Cypher(_matchAllWithFriends, _manyUsersWithFriends);



// export exposed functions

module.exports = {
  getById: getById,
  getByName: getByName,
  getRandom: getRandom,
  getRandomWithFriends: getRandomWithFriends,
  updateName: updateName,
  create: create,
  createMany: createMany,
  createRandom: createRandom,
  login: login,
  getAll: getAll,
  getAllCount: getAllCount,
  friendUser: friendUser,
  friendRandomUser: friendRandomUser,
  manyFriendships: manyFriendships,
  manyRandomFriendships: manyRandomFriendships,
  unfriendUser: unfriendUser,
  deleteUser: deleteUser,
  deleteAllUsers: deleteAllUsers,
  resetUsers: resetUsers,
  getWithFriends: getWithFriends,
  getWithFriendsAndFOF: getWithFriendsAndFOF,
  getWithFOF: getWithFOF,
  getAllWithFriends: getAllWithFriends
};