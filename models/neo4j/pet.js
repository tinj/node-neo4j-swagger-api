// extracts just the data from the query results

var _ = require('underscore');

var Pet = module.exports = function (_node) {
  _(this).extend(_node.data);
};

Pet.prototype.owners = function (owners) {
  if (owners && owners.length) {
    this.owners = owners;
  }
  return this.owners;
};

Pet.prototype.category = function (category) {
  if (category) {
    if (category.name) {
      this.category = category;
    } else if (category.data) {
      this.category = _.extend(category.data);
    }
  }
  return this.category;
};