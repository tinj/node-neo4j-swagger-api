// users.js
// Routes to CRUD users.

var User = require('../models/users');

var sw = require("swagger-node-express");
var param = sw.params;
var url = require("url");
var swe = sw.errors;

// var userData = require("../routes/users");

function writeResponse (res, data) {
  sw.setHeaders(res);
  res.send(JSON.stringify(data));
}


/**
 * GET /users
 */

exports.list = {
  'spec': {
    "description" : "List all users",
    "path" : "/users",
    "notes" : "Returns all users based on ID",
    "summary" : "Find all users by ID",
    "method": "GET",
    "params" : [],
    "responseClass" : "List[User]",
    "errorResponses" : [swe.notFound('user')],
    "nickname" : "getUsers"
  },
  'action': function (req,res) {
    User.getAll(function (err, users) {
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
    "params" : [param.body("User", "User object that needs to be added to the store", "User")],
    "errorResponses" : [swe.invalid('input')],
    "nickname" : "addUser"
  },
  'action': function(req, res) {
    var body = req.body;
    if (!body || !body.name){
      throw swe.invalid('user');
    } else {
      User.create({
        name: req.body['name']
      }, function (err, user) {
        if (err || !user) throw swe.invalid('input');
        res.send(JSON.stringify(user));
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
    "path" : "/user/{uuid}",
    "notes" : "Returns a user based on ID",
    "summary" : "Find user by ID",
    "method": "GET",
    "params" : [param.path("uuid", "ID of user that needs to be fetched", "string")],
    "responseClass" : "User",
    "errorResponses" : [swe.invalid('id'), swe.notFound('user')],
    "nickname" : "getUserById"
  },
  'action': function (req,res) {
    if (!req.params.uuid) {
      throw swe.invalid('uuid'); }
    var uuid = req.params.uuid;

    User.get(uuid, function (err, user) {
      if (err) throw swe.notFound('user');
      if (user) res.send(JSON.stringify(user));
      else throw swe.notFound('user');
    });
  }
};

exports.findByStatus = {
  'spec': {
    "description" : "Operations about users",
    "path" : "/user/findByStatus",
    "notes" : "Multiple status values can be provided with comma-separated strings",
    "summary" : "Find users by status",
    "method": "GET",
    "params" : [
      param.query("status", "Status in the store", "string", true, true, "LIST[available,pending,sold]", "available")
    ],
    "responseClass" : "List[User]",
    "errorResponses" : [swe.invalid('status')],
    "nickname" : "findUsersByStatus"
  },
  'action': function (req,res) {
    var statusString = url.parse(req.url,true).query["status"];
    if (!statusString) {
      throw swe.invalid('status'); }

    var output = userData.findUserByStatus(statusString);
    res.send(JSON.stringify(output));
  }
};

exports.findByTags = {
  'spec': {
    "path" : "/user/findByTags",
    "notes" : "Multiple tags can be provided with comma-separated strings. Use tag1, tag2, tag3 for testing.",
    "summary" : "Find users by tags",
    "method": "GET",
    "params" : [param.query("tags", "Tags to filter by", "string", true, true)],
    "responseClass" : "List[User]",
    "errorResponses" : [swe.invalid('tag')],
    "nickname" : "findUsersByTags"
  },
  'action': function (req,res) {
    var tagsString = url.parse(req.url,true).query["tags"];
    if (!tagsString) {
      throw swe.invalid('tag'); }
    var output = userData.findUserByTags(tagsString);
    writeResponse(res, output);
  }
};

/**
 * POST /users/:id
 */

exports.updateUser = {
  'spec': {
    "path" : "/user/{id}",
    "notes" : "updates a user in the store",
    "method": "POST",
    "summary" : "Update an existing user",
    "params" : [param.body("User", "User object that needs to be updated", "User")],
    "errorResponses" : [swe.invalid('id'), swe.notFound('user'), swe.invalid('input')],
    "nickname" : "updateUser"
  },
  'action': function(req, res) {
    var body = req.body;
    if(!body || !req.params.id){
      throw swe.invalid('user');
    }
    User.get(req.params.id, function (err, user) {
      if (err) throw swe.invalid('id');
      user.name = req.body.name;
      user.save(function (err) {
        if (err) throw swe.invalid('name');
        res.send(200);
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
    if (!req.params.uuid) throw swe.invalid('uuid');
    User.deleteUser(req.params.uuid, function (err) {
      if (err) throw swe.notFound('user');
      res.send(200);
    });
  }
};




/**
 * POST /users/:id/follow
 */
exports.follow = function (req, res, next) {
  User.get(req.params.id, function (err, user) {
    if (err) return next(err);
    User.get(req.body.user.id, function (err, other) {
      if (err) return next(err);
      user.follow(other, function (err) {
        if (err) return next(err);
        res.redirect('/users/' + user.id);
      });
    });
  });
};

/**
 * POST /users/:id/unfollow
 */
exports.unfollow = function (req, res, next) {
  User.get(req.params.id, function (err, user) {
    if (err) return next(err);
    User.get(req.body.user.id, function (err, other) {
      if (err) return next(err);
      user.unfollow(other, function (err) {
        if (err) return next(err);
        res.redirect('/users/' + user.id);
      });
    });
  });
};
