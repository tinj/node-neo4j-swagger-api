module.exports = (function () {
  // Central neo4j helper module


  var neo4j = require('neo4j')
  , db = new neo4j.GraphDatabase(process.env.NEO4J_URL || 'http://localhost:7474')
  ;

  // Cypher

  var _query = function (query, params, callback) {
    db.query(query, params, callback);
  };

  return _query;
}());