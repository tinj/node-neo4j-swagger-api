// users.js
// Routes to CRUD users.

var Users = require('../models/users');

var sw = require("swagger-node-express");
var param = sw.params;
var url = require("url");
var swe = sw.errors;
var _ = require('underscore');

function writeResponse (res, data) {
  sw.setHeaders(res);
  res.send(JSON.stringify(data));
}

function writeDataResponse (res, results, q_raws, raws, start) {
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

      writeDataResponse(res, users, q_raws, raws, start);
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
      writeDataResponse(res, users, q_raws, raws, start);
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
      param.body("User", "User name", "newUser"),
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
        writeDataResponse(res, user, q_raws, raws, start);
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
      param.body("List[User]", "User name", "List[newUser]"),
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
        writeDataResponse(res, users, q_raws, raws, start);
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
        writeDataResponse(res, users, q_raws, raws, start);
      });
    }
  }
};


/**
 * GET /users/:uuid
 */

exports.findById = {
  'spec': {
    "description" : "Operations about users",
    "path" : "/users/{uuid}",
    "notes" : "Returns a user based on UUID",
    "summary" : "Find user by UUID",
    "method": "GET",
    "params" : [
      param.path("uuid", "UUID of user that needs to be fetched", "string"),
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "responseClass" : "User",
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user')],
    "nickname" : "getUserById"
  },
  'action': function (req,res) {
    var uuid = req.params.uuid;
    var q_raws = parseRaws(req);
    var start = new Date();
    if (!uuid) throw swe.invalid('uuid');

    Users.getByUUID({uuid: uuid}, {}, function (err, user, raws) {
      if (err) throw swe.notFound('user');
      writeDataResponse(res, user, q_raws, raws, start);
    });
  }
};

exports.findByIdWithFriends = {
  'spec': {
    "description" : "Operations about users",
    "path" : "/users/{uuid}/friends",
    "notes" : "Returns a user based on ID",
    "summary" : "Find user by ID",
    "method": "GET",
    "params" : [
      param.path("uuid", "ID of user that needs to be fetched", "string"),
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "responseClass" : "User",
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user')],
    "nickname" : "getByIdWithFriends"
  },
  'action': function (req,res) {
    var uuid = req.params.uuid;
    var q_raws = parseRaws(req);
    var start = new Date();
    if (!uuid) throw swe.invalid('uuid');

    Users.getWithFriends({uuid: uuid}, {}, function (err, user, raws) {
      if (err) throw swe.notFound('user');
      writeDataResponse(res, user, q_raws, raws, start);
    });
  }
};


/**
 * POST /users/:id
 */

exports.updateUser = {
  'spec': {
    "path" : "/users/{uuid}",
    "notes" : "updates a user name",
    "method": "PUT",
    "summary" : "Update an existing user",
    "params" : [
      param.path("uuid", "ID of user that needs to be fetched", "string"),
      param.body("User", "User object that needs to be updated", "User"),
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "updateUser"
  },
  'action': function(req, res) {
    var q_raws = parseRaws(req);
    var start = new Date();
    var body = req.body;
    var uuid = req.params.uuid;
    if (!body || !uuid || !body.name){
      throw swe.invalid('user');
    }
    var params = {
      uuid: uuid,
      name: body.name
    };
    Users.updateName(params, {}, function (err, user, raws) {
      if (err) throw swe.invalid('uuid');
      if (!user) throw swe.invalid('user');
      writeDataResponse(res, user, q_raws, raws, start);
    });
  }
};

/**
 * DELETE /user/:uuid
 */

exports.deleteUser = {
  'spec': {
    "path" : "/users/{uuid}",
    "notes" : "removes a user from the db",
    "method": "DELETE",
    "summary" : "Remove an existing user",
    "params" : [
      param.path("uuid", "UUID of user that needs to be removed", "string"),
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user')],
    "nickname" : "deleteUser"
  },
  'action': function(req, res) {
    var uuid = req.params.uuid;
    var q_raws = parseRaws(req);
    var start = new Date();
    if (!uuid) throw swe.invalid('uuid');

    Users.deleteUser({uuid: uuid}, {}, function (err) {
      if (err) throw swe.invalid('user');
      res.send(200);
    });
  }
};


/**
 * DELETE /user/:uuid
 */

exports.deleteAllUsers = {
  'spec': {
    "path" : "/users",
    "notes" : "removes all users from the db",
    "method": "DELETE",
    "summary" : "Removes all users",
    "errorResponses" : [swe.invalid('user')],
    "params" : [
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    // "responseClass": 'code', // does this work?
    "nickname" : "deleteAllUsers"
  },
  'action': function(req, res) {
    var q_raws = parseRaws(req);
    var start = new Date();
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
        writeDataResponse(res, users, q_raws, raws, start);
      });
    });
  }
};


/**
 * POST /users/:id/follow
 */

exports.friendUser = {
  'spec': {
    "path" : "/users/{uuid}/friend/{friend}",
    "notes" : "friends a user by UUID",
    "method": "POST",
    "summary" : "Friend an existing user",
    "params" : [
      param.path("uuid", "UUID of the user", "string"),
      param.path("friend", "UUID of the user to be friended", "string"),
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "friendUser"
  },
  'action': function(req, res) {
    var q_raws = parseRaws(req);
    var start = new Date();
    var uuid = req.params.uuid;
    var friend = req.params.friend;
    if (!uuid || !friend){
      throw swe.invalid('user');
    }
    if (friend == uuid) {
      throw swe.invalid('friend');
    }
    var params = {
      uuid: uuid,
      friend: friend
    };
    Users.friendUser(params, {}, function (err, results, raws) {
      if (err) throw swe.invalid('uuid');
      if (!results) throw swe.invalid('user');
      writeDataResponse(res, results, q_raws, raws, start);
    });
  }
};

exports.unfriendUser = {
  'spec': {
    "path" : "/users/{uuid}/unfriend/{friend}",
    "notes" : "unfriend a user by UUID",
    "method": "POST",
    "summary" : "Unfriend an existing user",
    "params" : [
      param.path("uuid", "UUID of the user", "string"),
      param.path("friend", "UUID of the user to be unfriended", "string"),
      param.query("raws", "Include neo4j query/results", "boolean", false, false, "LIST[true, false]")
    ],
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "unfriendUser"
  },
  'action': function(req, res) {
    var q_raws = parseRaws(req);
    var start = new Date();
    var uuid = req.params.uuid;
    var friend = req.params.friend;
    if (!uuid || !friend){
      throw swe.invalid('user');
    }
    if (friend == uuid) {
      throw swe.invalid('friend');
    }
    var params = {
      uuid: uuid,
      friend: friend
    };
    Users.unfriendUser(params, {}, function (err, results, raws) {
      if (err) throw swe.invalid('uuid');
      if (!results) throw swe.invalid('user');
      writeDataResponse(res, results, q_raws, raws, start);
    });
  }
};