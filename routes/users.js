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

// function writeResponseEnvelope (res, data) {
//   var envelope = {
//     response: data,
//     extra: 'extra metadata'
//   };
//   sw.setHeaders(res);
//   res.send(JSON.stringify(envelope));
// }


/**
 * GET /users
 */

exports.list = {
  'spec': {
    "description" : "List all users",
    "path" : "/users",
    "notes" : "Returns all users",
    "summary" : "Find all users",
    "method": "GET",
    "params" : [],
    "responseClass" : "List[User]",
    "errorResponses" : [swe.notFound('user')],
    "nickname" : "getUsers"
  },
  'action': function (req,res) {
    Users.getAll(null, {}, function (err, users) {
      if (err || !users) throw swe.notFound('users');
      res.send(JSON.stringify(users));
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
    "params" : [],
    "responseClass" : "List[User]",
    "errorResponses" : [swe.notFound('user')],
    "nickname" : "getUsersWithFriends"
  },
  'action': function (req,res) {
    Users.getAllWithFriends(null, {}, function (err, users) {
      if (err || !users) throw swe.notFound('users');
      res.send(JSON.stringify(users));
    });
  }
};



/**
 * POST /users
 */

var names = [
  'Mat',
  'Jo',
  'Billy',
  'Sarah',
  'Ann',
  'Jackson',
  'Mel',
  'Carla',
];

function randomNameDefault () {
  return JSON.stringify({name: _.sample(names)});
}

exports.addUser = {
  'spec': {
    "path" : "/users",
    "notes" : "adds a user to the graph",
    "summary" : "Add a new user to the graph",
    "method": "POST",
    "responseClass" : "User",
    "params" : [param.body("User", "User name", "newUser", randomNameDefault())],
    "errorResponses" : [swe.invalid('input')],
    "nickname" : "addUser"
  },
  'action': function(req, res) {
    // var name = url.parse(req.url,true).query["name"];
    var name = req.body ? req.body.name : null;
    if (!name){
      throw swe.invalid('name');
    } else {
      Users.create({
        name: name
      }, {}, function (err, user) {
        if (err || !user) throw swe.invalid('input');
        res.send(JSON.stringify(user));
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
    "params" : [param.path("uuid", "UUID of user that needs to be fetched", "string")],
    "responseClass" : "User",
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user')],
    "nickname" : "getUserById"
  },
  'action': function (req,res) {
    var uuid = req.params.uuid;
    if (!uuid) throw swe.invalid('uuid');

    Users.getByUUID({uuid: uuid}, {}, function (err, user) {
      if (err) throw swe.notFound('user');
      if (user) res.send(JSON.stringify(user));
      else throw swe.notFound('user');
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
    "params" : [param.path("uuid", "ID of user that needs to be fetched", "string")],
    "responseClass" : "User",
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user')],
    "nickname" : "getByIdWithFriends"
  },
  'action': function (req,res) {
    var uuid = req.params.uuid;
    if (!uuid) throw swe.invalid('uuid');

    Users.getWithFriends({uuid: uuid}, {}, function (err, user) {
      if (err) throw swe.notFound('user');
      if (user) res.send(JSON.stringify(user));
      else throw swe.notFound('user');
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
    "params" : [param.path("uuid", "ID of user that needs to be fetched", "string"),
                param.body("User", "User object that needs to be updated", "User")],
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "updateUser"
  },
  'action': function(req, res) {
    var start = new Date();
    var body = req.body;
    var uuid = req.params.uuid;
    if (!body || !uuid || !body.name){
      throw swe.invalid('user');
    }
    var params = {
      uuid: uuid,
      name: req.body.name
    };
    Users.updateName(params, {}, function (err, user) {
      if (err) {
        console.log(err);
        throw swe.invalid('uuid');
      }
      if (!user) throw swe.invalid('user');
      writeResponse(res, {
        response: user,
        durationMS: new Date() - start
      });
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
    "params" : [param.path("uuid", "UUID of user that needs to be removed", "string")],
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user')],
    "nickname" : "deleteUser"
  },
  'action': function(req, res) {
    var uuid = req.params.uuid;
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
    // "responseClass": 'code', // does this work?
    "nickname" : "deleteAllUsers"
  },
  'action': function(req, res) {
    Users.deleteAllUsers(null, null, function (err) {
      if (err) throw swe.invalid('user');
      res.send(200); // is this working? swagger isn't acknowledging this
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
    "params" : [param.path("uuid", "UUID of the user", "string"),
                param.path("friend", "UUID of the user to be friended", "string")],
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "friendUser"
  },
  'action': function(req, res) {
    var start = new Date();
    // var body = req.body;
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
    Users.friendUser(params, {}, function (err, user, friend) {
      if (err) {
        console.log(err);
        throw swe.invalid('uuid');
      }
      if (!user) throw swe.invalid('user');
      writeResponse(res, {
        response: {
          user: user,
          friend: friend
        },
        durationMS: new Date() - start
      });
    });
  }
};

exports.unfriendUser = {
  'spec': {
    "path" : "/users/{uuid}/unfriend/{friend}",
    "notes" : "unfriend a user by UUID",
    "method": "POST",
    "summary" : "Unfriend an existing user",
    "params" : [param.path("uuid", "UUID of the user", "string"),
                param.path("friend", "UUID of the user to be unfriended", "string")],
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "unfriendUser"
  },
  'action': function(req, res) {
    var start = new Date();
    // var body = req.body;
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
    Users.unfriendUser(params, {}, function (err, user, friend) {
      if (err) {
        console.log(err);
        throw swe.invalid('uuid');
      }
      if (!user) throw swe.invalid('user');
      writeResponse(res, {
        response: {
          user: user,
          friend: friend
        },
        durationMS: new Date() - start
      });
    });
  }
};