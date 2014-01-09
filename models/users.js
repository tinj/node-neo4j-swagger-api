/**
 *  neo4j user functions
 *  these are mostly written in a functional style
 */


var _ = require('underscore');
var uuid = require('hat'); // generates uuids
var Architect = require('neo4j-architect');
Architect.init();
var Construct = Architect.Construct;
var Cypher = Architect.Cypher;
var User = require('../models/neo4j/user');
// var async = require('async');
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
  if (!results.length) return callback();
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


var _matchBy = function (keys, params, callback) {
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
var _getRandom = function (params, callback) {
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
var _getRandomWithFriends = function (params, callback) {
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


var _getAllCount = function (params, callback) {
  var cypher_params = {};

  var query = [
    'MATCH (user:User)',
    'RETURN COUNT(user) as c'
  ].join('\n');

  callback(null, query, cypher_params);
};

var _updateName = function (params, callback) {
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
var _create = function (params, callback) {
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
// var _createMany = function (params, callback) {
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
var _delete = function (params, callback) {
  var cypher_params = {
    id: params.id
  };

  var query = [
    'MATCH (user:User {id:{id}})',
    'OPTIONAL MATCH (user)-[r]-()',
    'DELETE user, r',
  ].join('\n');

  // add confirmation?

  callback(null, query, cypher_params);
};

// var __delete = new Cypher()
//                     .params('id')
//                     .match({label: 'User', name: 'user', props: 'id'})
//                     .optional('(user)-[r]-()')
//                     .delete(['user','r']);

// var ___delete = Cypher.deleteNode({label: 'User', name: 'user', params: 'id'});

// delete all users
var _deleteAll = function (params, callback) {
  var cypher_params = {};

  var query = [
    'MATCH (user:User)',
    'OPTIONAL MATCH (user)-[r]-()',
    'DELETE user, r',
  ].join('\n');
  callback(null, query, cypher_params);
};


// friend the user
var _friend = function (params, callback) {
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
var _friendRandom = function (params, callback) {
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
var _unfriend = function (params, callback) {
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
var _matchWithFriends = function (params, callback) {
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
var _matchWithFriendsAndFOF = function (params, callback) {
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
var _matchWithFOF = function (params, callback) {
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
var _matchAllWithFriends = function (params, callback) {
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
var getById = new Construct(_matchByUUID).query().then(_singleUser);

// get a single user by name
var getByName = new Construct(_matchByName).query().then(_singleUser);

// get n random users
var getRandom = new Construct(_getRandom).query().then(_manyUsers);

// get n random users
var getRandomWithFriends = new Construct(_getRandomWithFriends).query().then(_manyUsersWithFriends);

// get a user by id and update their name
var updateName = new Construct(_updateName, _singleUser);

// create a new user
var create = new Construct(_create, _singleUser);

var _createManySetup = function (params, callback) {
  if (params.names && _.isArray(params.names)) {
    callback(null, _.map(params.names, function (name) {
      return {name: name};
    }));
  } else if (params.users && _.isArray(params.users)) {
    callback(null, _.map(params.users, function (user) {
      return _.pick(user, 'name', 'id');
    }));
  } else {
    callback(null, []);
  }
};

// create many new users
var createMany = new Construct(_createManySetup).map(create);

var _createRandomSetup = function (params, callback) {
  var names = _randomNames(params.n || 1);
  callback(null, {names: names});
};

var createRandom = new Construct(_createRandomSetup).then(createMany);

// login a user
var login = create;

// get all users
var getAll = new Construct(_matchAll, _manyUsers);

// get all users count
// var getAllCount = new Construct().query(_getAllCount).then(_singleCount);
var getAllCount = new Construct(_getAllCount).query().then(_singleCount);

// friend a user by id
var friendUser = new Construct(_friend).query().then(_singleUserWithFriend);

// friend random users
var friendRandomUser = new Construct(_friendRandom, _singleUserWithFriends);

// creates n new friendships between users
var _assignManyFriendships = function (params, callback) {
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
    _.sample(users).n++;
  }

  users = _.filter(users, function (user) {
    return user.n > 0;
  });
  callback(null, users);
};

var manyFriendships = new Construct(_assignManyFriendships).mapSeries(friendRandomUser);

// merge initParams and params
var _manyFriendshipsSetup = function (params, callback) {
  callback(null, {
    users: params,
    friendships: this.params.friendships || this.params.n
  });
};

// creates many friendships between random users
var manyRandomFriendships = new Construct(getRandom).then(_manyFriendshipsSetup).then(manyFriendships);

// unfriend a user by id
var unfriendUser = new Construct(_unfriend, _singleUserWithFriend);

// delete a user by id
var deleteUser = new Construct(_delete);

// delete a user by id
var deleteAllUsers = new Construct(_deleteAll);

// reset all users
var resetUsers = new Construct(deleteAllUsers)
                              .params()
                              .then(createRandom)
                              .then(_manyFriendshipsSetup)
                              .then(manyFriendships);

// get a single user by id and all friends
var getWithFriends = new Construct(_matchWithFriends, _singleUserWithFriends);

// get a single user by id and all friends and friends of friends
var getWithFriendsAndFOF = new Construct(_matchWithFriendsAndFOF, _singleUserWithFriendsAndFOF);

// get a single user by id and all friends of friends
var getWithFOF = new Construct(_matchWithFOF, _singleUserWithFOF);

// get all users and all friends
var getAllWithFriends = new Construct(_matchAllWithFriends, _manyUsersWithFriends);



// export exposed functions

module.exports = {
  getById: getById.done(),
  getByName: getByName.done(),
  getRandom: getRandom.done(),
  getRandomWithFriends: getRandomWithFriends.done(),
  updateName: updateName.done(),
  create: create.done(),
  createMany: createMany.done(),
  createRandom: createRandom.done(),
  login: login.done(),
  getAll: getAll.done(),
  getAllCount: getAllCount.done(),
  friendUser: friendUser.done(),
  friendRandomUser: friendRandomUser.done(),
  manyFriendships: manyFriendships.done(),
  manyRandomFriendships: manyRandomFriendships.done(),
  unfriendUser: unfriendUser.done(),
  deleteUser: deleteUser.done(),
  deleteAllUsers: deleteAllUsers.done(),
  resetUsers: resetUsers.done(),
  getWithFriends: getWithFriends.done(),
  getWithFriendsAndFOF: getWithFriendsAndFOF.done(),
  getWithFOF: getWithFOF.done(),
  getAllWithFriends: getAllWithFriends.done()
};