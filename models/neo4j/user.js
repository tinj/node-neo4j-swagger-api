// extracts just the data from the query results

var _ = require('underscore');

var User = module.exports = function (_node) {
  _(this).extend(_node.data);
};

User.prototype.friends = function (friends) {
  if (friends && friends.length) {
    this.friends = friends;
  }
  return this.friends;
};