// users.js
// Routes to CRUD users.

var User = require('../models/users');

var sw = require("swagger-node-express");
var param = sw.params;
var url = require("url");
var swe = sw.errors;

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
    User.getAll(null, {}, function (err, users) {
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
    User.getAllWithFriends(null, {}, function (err, users) {
      if (err || !users) throw swe.notFound('users');
      res.send(JSON.stringify(users));
    });
  }
};



/**
 * POST /users
 */

exports.addUser = {
  'spec': {
    "path" : "/users",
    "notes" : "adds a user to the store",
    "summary" : "Add a new user to the store",
    "method": "POST",
    "responseClass" : "User",
    "params" : [param.query("name", "User name", "string")],
    "errorResponses" : [swe.invalid('input')],
    "nickname" : "addUser"
  },
  'action': function(req, res) {
    var name = url.parse(req.url,true).query["name"];
    if (!name){
      throw swe.invalid('name');
    } else {
      User.create({
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
    "path" : "/user/{uuid}",
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

    User.getByUUID({uuid: uuid}, {}, function (err, user) {
      if (err) throw swe.notFound('user');
      if (user) res.send(JSON.stringify(user));
      else throw swe.notFound('user');
    });
  }
};

exports.findByIdWithFriends = {
  'spec': {
    "description" : "Operations about users",
    "path" : "/user/{uuid}/friends",
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

    User.getWithFriends({uuid: uuid}, {}, function (err, user) {
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
    "path" : "/user/{uuid}",
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
    User.updateName(params, {}, function (err, user) {
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
    "path" : "/user/{uuid}",
    "notes" : "removes a user from the store",
    "method": "DELETE",
    "summary" : "Remove an existing user",
    "params" : [param.path("uuid", "UUID of user that needs to be removed", "string")],
    "errorResponses" : [swe.invalid('uuid'), swe.notFound('user')],
    "nickname" : "deleteUser"
  },
  'action': function(req, res) {
    var uuid = req.params.uuid;
    if (!uuid) throw swe.invalid('uuid');

    User.deleteUser({uuid: uuid}, {}, function (err) {
      if (err) throw swe.invalid('user');
      res.send(200);
    });
  }
};




/**
 * POST /users/:id/follow
 */

exports.friendUser = {
  'spec': {
    "path" : "/user/{uuid}/friend/{friend}",
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
    User.friendUser(params, {}, function (err, user, friend) {
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
    "path" : "/user/{uuid}/unfriend/{friend}",
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
    User.unfriendUser(params, {}, function (err, user, friend) {
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