// users.js
// Routes to CRUD users.

var Users = require('../models/users');

var sw = require("swagger-node-express");
var param = sw.params;
var url = require("url");
var swe = sw.errors;
// var _ = require('underscore');


function writeResponse (res, results, q_raws, raws, start) {
  sw.setHeaders(res);
  var data = {
    response: results,
    durationMS: new Date() - start
  };
  if (q_raws) {
    data.raws = raws;
  }
  res.send(JSON.stringify(data));
}

function parseRaws (req) {
  return 'true' == url.parse(req.url,true).query["raws"];
}

// function writeResponseEnvelope (res, data, raws) {
//   var envelope = {
//     response: data,
//     raws: raws
//   };
//   sw.setHeaders(res);
//   res.send(JSON.stringify(envelope));
// }


exports.list = {
  'spec': {
    "description" : "List all users",
    "path" : "/users",
    "notes" : "Returns all users",
    "summary" : "Find all users",
    "method": "GET",
    "params" : [
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "responseClass" : "List[User]",
    "errorResponses" : [swe.notFound('user')],
    "nickname" : "getUsers"
  },
  'action': function (req, res) {
    var q_raws = parseRaws(req);
    var start = new Date();
    Users.getAll(null, {}, function (err, users, raws) {
      if (err || !users) throw swe.notFound('users');

      writeResponse(res, users, q_raws, raws, start);
    });
  }
};

exports.listWithFriends = {
  'spec': {
    "description" : "List all users",
    "path" : "/users/friends",
    "notes" : "Returns all users and their friends",
    "summary" : "Find all users and their friends",
    "method": "GET",
    "params" : [
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "responseClass" : "List[User]",
    "errorResponses" : [swe.notFound('user')],
    "nickname" : "getUsersWithFriends"
  },
  'action': function (req,res) {
    var q_raws = parseRaws(req);
    var start = new Date();
    Users.getAllWithFriends(null, {}, function (err, users, raws) {
      if (err || !users) throw swe.notFound('users');
      writeResponse(res, users, q_raws, raws, start);
    });
  }
};


exports.addUser = {
  'spec': {
    "path" : "/users",
    "notes" : "adds a user to the graph",
    "summary" : "Add a new user to the graph",
    "method": "POST",
    "responseClass" : "User",
    "params" : [
      param.body("body", "User name", "newUser"),
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('input')],
    "nickname" : "addUser"
  },
  'action': function(req, res) {
    var q_raws = parseRaws(req);
    var start = new Date();
    var name = req.body ? req.body.name : null;
    if (!name){
      throw swe.invalid('name');
    } else {
      Users.create({
        name: name
      }, {}, function (err, user, raws) {
        if (err || !user) throw swe.invalid('input');
        writeResponse(res, user, q_raws, raws, start);
      });
    }
  }
};


exports.addUsers = {
  'spec': {
    "path" : "/users/many",
    "notes" : "adds many users to the graph",
    "summary" : "Add many new users to the graph",
    "method": "POST",
    "responseClass" : "List[User]",
    "params" : [
      param.body("body", "User name", "List[newUser]"),
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('input')],
    "nickname" : "addManyUsers"
  },
  'action': function(req, res) {
    var q_raws = parseRaws(req);
    var start = new Date();
    var users = req.body ? req.body.users : null;
    if (!users){
      throw swe.invalid('users');
    } else {
      Users.createMany({
        users: users
      }, {}, function (err, users, raws) {
        if (err || !users) throw swe.invalid('input');
        writeResponse(res, users, q_raws, raws, start);
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
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('input')],
    "nickname" : "addRandomUsers"
  },
  'action': function(req, res) {
    var q_raws = parseRaws(req);
    var start = new Date();
    var n = parseInt(req.params.n);
    if (!n){
      throw swe.invalid('input');
    } else {
      Users.createRandom({n:n}, null, function (err, users, raws) {
        if (err || !users) throw swe.invalid('input');
        writeResponse(res, users, q_raws, raws, start);
      });
    }
  }
};


/**
 * GET /users/:id
 */

exports.findById = {
  'spec': {
    "description" : "Operations about users",
    "path" : "/users/{id}",
    "notes" : "Returns a user based on ID",
    "summary" : "Find user by ID",
    "method": "GET",
    "params" : [
      param.path("id", "ID of user that needs to be fetched", "string"),
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "responseClass" : "User",
    "errorResponses" : [swe.invalid('id'), swe.notFound('user')],
    "nickname" : "getUserById"
  },
  'action': function (req,res) {
    var id = req.params.id;
    var q_raws = parseRaws(req);
    var start = new Date();
    if (!id) throw swe.invalid('id');

    Users.getById({id: id}, {}, function (err, user, raws) {
      if (err) throw swe.notFound('user');
      writeResponse(res, user, q_raws, raws, start);
    });
  }
};

exports.findByIdWithFriends = {
  'spec': {
    "description" : "Operations about users",
    "path" : "/users/{id}/friends",
    "notes" : "Returns a user based on ID",
    "summary" : "Find user by ID",
    "method": "GET",
    "params" : [
      param.path("id", "ID of user that needs to be fetched", "string"),
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "responseClass" : "User",
    "errorResponses" : [swe.invalid('id'), swe.notFound('user')],
    "nickname" : "getByIdWithFriends"
  },
  'action': function (req,res) {
    var id = req.params.id;
    var q_raws = parseRaws(req);
    var start = new Date();
    if (!id) throw swe.invalid('id');

    Users.getWithFriends({id: id}, {}, function (err, user, raws) {
      if (err) throw swe.notFound('user');
      writeResponse(res, user, q_raws, raws, start);
    });
  }
};


/**
 * POST /users/:id
 */

exports.updateUser = {
  'spec': {
    "path" : "/users/{id}",
    "notes" : "updates a user name",
    "method": "PUT",
    "summary" : "Update an existing user",
    "params" : [
      param.path("id", "ID of user that needs to be fetched", "string"),
      param.body("body", "User object that needs to be updated", "User"),
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('id'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "updateUser"
  },
  'action': function(req, res) {
    var q_raws = parseRaws(req);
    var start = new Date();
    var body = req.body;
    var id = req.params.id;
    if (!body || !id || !body.name){
      throw swe.invalid('user');
    }
    var params = {
      id: id,
      name: body.name
    };
    Users.updateName(params, {}, function (err, user, raws) {
      if (err) throw swe.invalid('id');
      if (!user) throw swe.invalid('user');
      writeResponse(res, user, q_raws, raws, start);
    });
  }
};

/**
 * DELETE /user/:id
 */

exports.deleteUser = {
  'spec': {
    "path" : "/users/{id}",
    "notes" : "removes a user from the db",
    "method": "DELETE",
    "summary" : "Remove an existing user",
    "params" : [
      param.path("id", "ID of user that needs to be removed", "string"),
      // param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('id'), swe.notFound('user')],
    "nickname" : "deleteUser"
  },
  'action': function(req, res) {
    var id = req.params.id;
    // var q_raws = parseRaws(req);
    // var start = new Date();
    if (!id) throw swe.invalid('id');

    Users.deleteUser({id: id}, {}, function (err) {
      if (err) throw swe.invalid('user');
      res.send(200);
    });
  }
};


/**
 * DELETE /user/:id
 */

exports.deleteAllUsers = {
  'spec': {
    "path" : "/users",
    "notes" : "removes all users from the db",
    "method": "DELETE",
    "summary" : "Removes all users",
    "errorResponses" : [swe.invalid('user')],
    "params" : [
      // param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    // "responseClass": 'code', // does this work?
    "nickname" : "deleteAllUsers"
  },
  'action': function(req, res) {
    // var q_raws = parseRaws(req);
    // var start = new Date();
    Users.deleteAllUsers(null, null, function (err) {
      if (err) throw swe.invalid('user');
      res.send(200); // is this working? swagger isn't acknowledging this
    });
  }
};

exports.resetUsers = {
  'spec': {
    "path" : "/users/reset",
    "notes" : "removes all users from the db and adds n random users",
    "method": "POST",
    "summary" : "Removes all users and then adds n random users",
    "errorResponses" : [swe.invalid('user')],
    "responseClass" : "List[User]",
    "params" : [
      param.query("n", "Number of random users to be created", "integer", null, null, null, 10),
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "nickname" : "resetUsers"
  },
  'action': function(req, res) {
    var q_raws = parseRaws(req);
    var start = new Date();
    var n = parseInt(url.parse(req.url,true).query["n"]) || 10;
    Users.deleteAllUsers(null, null, function (err) {
      if (err) throw swe.invalid('user');
      Users.createRandom({n:n}, null, function (err, users, raws) {
        if (err || !users) throw swe.invalid('input');
        writeResponse(res, users, q_raws, raws, start);
      });
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
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('id'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "friendUser"
  },
  'action': function(req, res) {
    var q_raws = parseRaws(req);
    var start = new Date();
    var id = req.params.id;
    var friend_id = req.params.friend_id;
    if (!id || !friend_id){
      throw swe.invalid('user');
    }
    if (friend_id == id) {
      throw swe.invalid('friend_id');
    }
    var params = {
      id: id,
      friend_id: friend_id
    };
    Users.friendUser(params, {}, function (err, results, raws) {
      if (err) throw swe.invalid('id');
      if (!results) throw swe.invalid('user');
      writeResponse(res, results, q_raws, raws, start);
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
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('id'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "friendUser"
  },
  'action': function(req, res) {
    var q_raws = parseRaws(req);
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
    Users.friendRandomUser(params, {}, function (err, results, raws) {
      if (err) throw swe.invalid('id');
      if (!results) throw swe.invalid('user');
      writeResponse(res, results, q_raws, raws, start);
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
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('id'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "unfriendUser"
  },
  'action': function(req, res) {
    var q_raws = parseRaws(req);
    var start = new Date();
    var id = req.params.id;
    var friend_id = req.params.friend_id;
    if (!id || !friend_id){
      throw swe.invalid('user');
    }
    if (friend_id == id) {
      throw swe.invalid('friend_id');
    }
    var params = {
      id: id,
      friend_id: friend_id
    };
    Users.unfriendUser(params, {}, function (err, results, raws) {
      if (err) throw swe.invalid('id');
      if (!results) throw swe.invalid('user');
      writeResponse(res, results, q_raws, raws, start);
    });
  }
};