// users.js
// Routes to CRUD users.

var Users = require('../models/users');

var sw = require("swagger-node-express");
var param = sw.params;
var url = require("url");
var swe = sw.errors;
var _ = require('underscore');


/*
 *  Util Functions
 */

function writeResponse (res, response, start) {
  sw.setHeaders(res);
  // move neo4j from response to headers?

  // move duration from response to headers?
  response.durationMS = new Date() - start;
  res.send(JSON.stringify(response));
}

function parseUrl(req, key) {
  return url.parse(req.url,true).query[key];
}

function parseBool (req, key) {
  return 'true' == url.parse(req.url,true).query[key];
}


/*
 * API Specs and Functions
 */

exports.list = {
  'spec': {
    "description" : "List all users",
    "path" : "/users",
    "notes" : "Returns all users",
    "summary" : "Find all users",
    "method": "GET",
    "params" : [
      param.query("friends", "Include friends", "boolean", false, false, "LIST[true, false]", "true"),
      param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "responseClass" : "List[User]",
    "errorResponses" : [swe.notFound('users')],
    "nickname" : "getUsers"
  },
  'action': function (req, res) {
    var friends = parseBool(req, 'friends');
    var options = {
      neo4j: parseBool(req, 'neo4j')
    };
    var start = new Date();

    if (friends) {
      Users.getAllWithFriends(null, options, function (err, response) {
        if (err || !response.results) throw swe.notFound('users');
        writeResponse(res, response, start);
      });
    } else {
      Users.getAll(null, options, function (err, response) {
        if (err || !response.results) throw swe.notFound('users');
        writeResponse(res, response, start);
      });
    }
  }
};

exports.userCount = {
  'spec': {
    "description" : "User count",
    "path" : "/users/count",
    "notes" : "User count",
    "summary" : "User count",
    "method": "GET",
    "params" : [
      param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "responseClass" : "Count",
    "errorResponses" : [swe.notFound('users')],
    "nickname" : "userCount"
  },
  'action': function (req, res) {
    var options = {
      neo4j: parseBool(req, 'neo4j')
    };
    var start = new Date();
    Users.getAllCount(null, options, function (err, response) {
      // if (err || !response.results) throw swe.notFound('users');
      writeResponse(res, response, start);
    });
  }
};

exports.addUser = {
  'spec': {
    "path" : "/users",
    "notes" : "adds a user to the graph",
    "summary" : "Add a new user to the graph",
    "method": "POST",
    "responseClass" : "List[User]",
    "params" : [
      param.query("name", "User name, seperate multiple names by commas", "string", true, true),
      param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('input')],
    "nickname" : "addUser"
  },
  'action': function(req, res) {
    var options = {
      neo4j: parseBool(req, 'neo4j')
    };
    var start = new Date();
    var names = _.invoke(parseUrl(req, 'name').split(','), 'trim');
    if (!names.length){
      throw swe.invalid('name');
    } else {
      Users.createMany({
        names: names
      }, options, function (err, response) {
        if (err || !response.results) throw swe.invalid('input');
        writeResponse(res, response, start);
      });
    }
  }
};


exports.addRandomUsers = {
  'spec': {
    "path" : "/users/random/{n}",
    "notes" : "adds many random users to the graph",
    "summary" : "Add many random new users to the graph",
    "method": "POST",
    "responseClass" : "List[User]",
    "params" : [
      param.path("n", "Number of random users to be created", "integer", null, 1),
      param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('input')],
    "nickname" : "addRandomUsers"
  },
  'action': function(req, res) {
    var options = {
      neo4j: parseBool(req, 'neo4j')
    };
    var start = new Date();
    var n = parseInt(req.params.n, 10);
    if (!n){
      throw swe.invalid('input');
    } else {
      Users.createRandom({n:n}, options, function (err, response) {
        if (err || !response.results) throw swe.invalid('input');
        writeResponse(res, response, start);
      });
    }
  }
};


exports.findById = {
  'spec': {
    "description" : "find a user",
    "path" : "/users/{id}",
    "notes" : "Returns a user based on ID",
    "summary" : "Find user by ID",
    "method": "GET",
    "params" : [
      param.path("id", "ID of user that needs to be fetched", "string"),
      param.query("friends", "Include friends", "boolean", false, false, "LIST[true, false]", "true"),
      param.query("fof", "Include friends of friends", "boolean", false, false, "LIST[true, false]"),
      param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "responseClass" : "User",
    "errorResponses" : [swe.invalid('id'), swe.notFound('user')],
    "nickname" : "getUserById"
  },
  'action': function (req,res) {
    var id = req.params.id;
    var options = {
      neo4j: parseBool(req, 'neo4j')
    };
    var start = new Date();
    var friends = parseBool(req, 'friends');
    var fof = parseBool(req, 'fof');

    if (!id) throw swe.invalid('id');

    var params = {
      id: id
    };

    var callback = function (err, response) {
      if (err) throw swe.notFound('user');
      writeResponse(res, response, start);
    };

    if (friends) {
      if (fof) {
        Users.getWithFriendsAndFOF(params, options, callback);
      } else {
        Users.getWithFriends(params, options, callback);
      }
    } else if (fof) {
      Users.getWithFOF(params, options, callback);
    } else {
      Users.getById(params, options, callback);
    }
  }
};

exports.getRandom = {
  'spec': {
    "description" : "get random users",
    "path" : "/users/random/{n}",
    "notes" : "Returns n random users",
    "summary" : "get random users",
    "method": "GET",
    "params" : [
      param.path("n", "Number of random users get", "integer", null, 1),
      param.query("friends", "Include friends", "boolean", false, false, "LIST[true, false]", "true"),
      param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "responseClass" : "User",
    "errorResponses" : [swe.invalid('id'), swe.notFound('user')],
    "nickname" : "getRandomUsers"
  },
  'action': function (req,res) {
    var n = parseInt(req.params.n, 10);
    var options = {
      neo4j: parseBool(req, 'neo4j')
    };
    var start = new Date();
    var friends = parseBool(req, 'friends');

    if (friends) {
      Users.getRandomWithFriends({n: n}, options, function (err, response) {
        if (err) throw swe.notFound('users');
        writeResponse(res, response, start);
      });
    } else {
      Users.getRandom({n: n}, options, function (err, response) {
        if (err) throw swe.notFound('users');
        writeResponse(res, response, start);
      });
    }
  }
};


exports.updateUser = {
  'spec': {
    "path" : "/users/{id}",
    "notes" : "updates a user name",
    "method": "PUT",
    "summary" : "Update an existing user",
    "params" : [
      param.path("id", "ID of user that needs to be fetched", "string"),
      param.query("name", "New user name", "string", true),
      param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('id'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "updateUser"
  },
  'action': function(req, res) {
    var options = {
      neo4j: parseBool(req, 'neo4j')
    };
    var start = new Date();
    var name = parseUrl(req, 'name').trim();
    var id = req.params.id;
    if (!id || !name.length){
      throw swe.invalid('user');
    }
    var params = {
      id: id,
      name: name
    };
    Users.updateName(params, options, function (err, response) {
      if (err) throw swe.invalid('id');
      if (!response.results) throw swe.invalid('user');
      writeResponse(res, response, start);
    });
  }
};


exports.deleteUser = {
  'spec': {
    "path" : "/users/{id}",
    "notes" : "removes a user from the db",
    "method": "DELETE",
    "summary" : "Remove an existing user",
    "params" : [
      param.path("id", "ID of user that needs to be removed", "string"),
      // param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('id'), swe.notFound('user')],
    "nickname" : "deleteUser"
  },
  'action': function(req, res) {
    var id = req.params.id;
    // var start = new Date();
    if (!id) throw swe.invalid('id');

    Users.deleteUser({id: id}, null, function (err) {
      if (err) throw swe.invalid('user');
      res.send(200);
    });
  }
};


exports.deleteAllUsers = {
  'spec': {
    "path" : "/users",
    "notes" : "removes all users from the db",
    "method": "DELETE",
    "summary" : "Removes all users",
    "errorResponses" : [swe.invalid('user')],
    "params" : [
      // param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    // "responseClass": 'code', // does this work?
    "nickname" : "deleteAllUsers"
  },
  'action': function(req, res) {
    // var start = new Date();
    Users.deleteAllUsers(null, null, function (err) {
      if (err) throw swe.invalid('user');
      res.send(200); // is this working? swagger isn't acknowledging this
    });
  }
};

exports.resetUsers = {
  'spec': {
    "path" : "/users",
    "notes" : "Resets the graph with new users and friendships",
    "method": "PUT",
    "summary" : "Removes all users and then adds n random users",
    "errorResponses" : [swe.invalid('user'), swe.invalid('input')],
    "responseClass" : "List[User]",
    "params" : [
      param.query("n", "Number of random users to be created", "integer", null, null, null, 10),
      param.query("f", "Average number of friendships per user", "integer", false, null, "LIST[0,1,2,3]", "2"),
      param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "nickname" : "resetUsers"
  },
  'action': function(req, res) {
    var options = {
      neo4j: parseBool(req, 'neo4j')
    };
    var start = new Date();
    var n = parseInt(parseUrl(req, 'n'), 10) || 10;
    var f = parseInt(parseUrl(req, 'f'), 10) || 2;
    var friendships = Math.round(f*n/2);
    Users.resetUsers({n: n, friendships: friendships}, options, function (err, response) {
      if (err || !response.results) throw swe.invalid('input');
      writeResponse(res, response, start);
    });
  }
};


exports.friendUser = {
  'spec': {
    "path" : "/users/{id}/friend/{friend_id}",
    "notes" : "friends a user by ID",
    "method": "POST",
    "summary" : "Friend an existing user",
    "params" : [
      param.path("id", "ID of the user", "string"),
      param.path("friend_id", "ID of the user to be friended", "string"),
      param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('id'), swe.invalid('friend_id'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "friendUser"
  },
  'action': function(req, res) {
    var options = {
      neo4j: parseBool(req, 'neo4j')
    };
    var start = new Date();
    var id = req.params.id;
    var friend_id = req.params.friend_id;
    if (!id) {
      throw swe.invalid('user');
    }
    if (!friend_id || friend_id == id) {
      throw swe.invalid('friend_id');
    }
    var params = {
      id: id,
      friend_id: friend_id
    };
    Users.friendUser(params, options, function (err, response) {
      if (err) throw swe.invalid('id');
      if (!response.results) throw swe.invalid('user');
      writeResponse(res, response, start);
    });
  }
};


exports.manyRandomFriendships = {
  'spec': {
    "path" : "/users/random/friend/{n}",
    "notes" : "creates n random friendships",
    "method": "POST",
    "summary" : "create many random friendships",
    "params" : [
      param.path("n", "Number of random users", "integer", null, "1"),
      param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.notFound('users')],
    "nickname" : "manyRandomFriendships"
  },
  'action': function(req, res) {
    var options = {
      neo4j: parseBool(req, 'neo4j')
    };
    var start = new Date();
    var n = parseInt(req.params.n, 10) || 1;
    var params = {
      n: n
    };
    Users.manyRandomFriendships(params, options, function (err, response) {
      if (err) throw swe.notFound('users');
      writeResponse(res, response, start);
    });
  }
};

exports.friendRandomUser = {
  'spec': {
    "path" : "/users/{id}/friend/random/{n}",
    "notes" : "friends a random user",
    "method": "POST",
    "summary" : "Friend an existing user",
    "params" : [
      param.path("id", "ID of the user", "string"),
      param.path("n", "Number of new friends", "integer", "LIST[1,2,3,4,5]", "1"),
      param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('id'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "friendRandomUser"
  },
  'action': function(req, res) {
    var options = {
      neo4j: parseBool(req, 'neo4j')
    };
    var start = new Date();
    var id = req.params.id;
    var n = parseInt(req.params.n) || 1;
    if (!id) {
      throw swe.invalid('user');
    }
    var params = {
      id: id,
      n: n
    };
    Users.friendRandomUser(params, options, function (err, response) {
      if (err) throw swe.invalid('id');
      if (!response.results) throw swe.invalid('user');
      writeResponse(res, response, start);
    });
  }
};

exports.unfriendUser = {
  'spec': {
    "path" : "/users/{id}/unfriend/{friend_id}",
    "notes" : "unfriend a user by ID",
    "method": "POST",
    "summary" : "Unfriend an existing user",
    "params" : [
      param.path("id", "ID of the user", "string"),
      param.path("friend_id", "ID of the user to be unfriended", "string"),
      param.query("neo4j", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('id'), swe.invalid('friend_id'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "unfriendUser"
  },
  'action': function(req, res) {
    var options = {
      neo4j: parseBool(req, 'neo4j')
    };
    var start = new Date();
    var id = req.params.id;
    var friend_id = req.params.friend_id;
    if (!id) {
      throw swe.invalid('user');
    }
    if (!friend_id || friend_id == id) {
      throw swe.invalid('friend_id');
    }
    var params = {
      id: id,
      friend_id: friend_id
    };
    Users.unfriendUser(params, options, function (err, response) {
      if (err) throw swe.invalid('id');
      if (!response.results) throw swe.invalid('user');
      writeResponse(res, response, start);
    });
  }
};