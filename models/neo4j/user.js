var _ = require('underscore');

var User = module.exports = function (_node) {
  _(this).extend(_node.data);
};