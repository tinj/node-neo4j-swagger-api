/**
 *  neo4j pet functions
 *  these are mostly written in a functional style
 */


var _ = require('underscore');
var uuid = require('uuid');
var Cypher = require('../neo4j/cypher');
var Pet = require('../models/neo4j/pet');


/**
 *  Result Functions
 *  to be combined with queries using _.partial()
 */

// return a single pet
var _singlePet = function (results, callback) {
  callback(null, new Pet(results[0].pet));
};

// return many pets
var _manyPets = function (results, callback) {
  var pets = _.map(results, function (result) {
    return new Pet(result.pet);
  });

  callback(null, pets);
};

// returns a pet and a owner
var _singlePetWithOwner = function (results, callback) {
  callback(null, new Pet(results[0].pet), new Pet(results[0].owner));
};

// returns a pet and their owners from a cypher result
var _parsePetWithOwners = function (result) {
  var pet = new Pet(result.pet);
  var owners = _.map(result.owners, function (owner) {
    return new Pet(owner);
  });
  pet.owners(owners);
  return pet;
};

// returns a pet and their owners
var _singlePetWithOwners = function (results, callback) {
  callback(null, _parsePetWithOwners(results[0]));
};

// returns many pets and their owners
var _manyPetsWithOwners = function (results, callback) {
  var pets = _.map(results, _parsePetWithOwners);
  callback(null, pets);
};

/**
 *  Query Functions
 *  to be combined with result functions using _.partial()
 */


var _matchBy = function (keys, params, options, callback) {
  var cypher_params = _.pick(params, keys);

  var query = [
    'MATCH (pet:Pet)',
    Cypher.where('pet', keys),
    'RETURN pet'
  ].join('\n');

  callback(null, query, cypher_params);
};

var _matchByUUID = _.partial(_matchBy, ['uuid']);
var _matchByName = _.partial(_matchBy, ['name']);
var _matchAll = _.partial(_matchBy, []);


var _updateName = function (params, options, callback) {
  var cypher_params = {
    uuid : params.uuid,
    name : params.name
  };

  var query = [
    'MATCH (pet:Pet)',
    'WHERE pet.uuid = {uuid}',
    'SET pet.name = {name}',
    'RETURN pet'
  ].join('\n');

  callback(null, query, cypher_params);
};

// creates the pet with cypher
var _create = function (params, options, callback) {
  var cypher_params = {
    uuid: params.uuid || uuid(),
    name: params.name
  };

  var query = [
    'MERGE (pet:Pet {name: {name}, uuid: {uuid}})',
    'ON CREATE pet',
    'SET pet.created = timestamp()',
    'ON MATCH pet',
    'SET pet.lastLogin = timestamp()',
    'RETURN pet'
  ].join('\n');

  callback(null, query, cypher_params);
};

// delete the pet and any relationships with cypher
var _delete = function (params, options, callback) {
  var cypher_params = {
    uuid: params.uuid
  };

  var query = [
    'MATCH (pet:Pet)',
    'WHERE pet.uuid={uuid}',
    'WITH pet',
    'MATCH (pet)-[r?]-()',
    'DELETE pet, r',
  ].join('\n');
  callback(null, query, cypher_params);
};


// owner the pet
var _owner = function (params, options, callback) {
  var cypher_params = {
    uuid: params.uuid,
    owner: params.owner
  };

  var query = [
    'MATCH (pet:Pet), (owner:Pet)',
    'WHERE pet.uuid={uuid} AND owner.uuid={owner} AND NOT((pet)-[:owner]-(owner))',
    'CREATE (pet)-[:owner {created: timestamp()}]->(owner)',
    'RETURN pet, owner'
  ].join('\n');
  callback(null, query, cypher_params);
};

// unowner the pet
var _unowner = function (params, options, callback) {
  var cypher_params = {
    uuid: params.uuid,
    owner: params.owner
  };

  var query = [
    'MATCH (pet:Pet)-[r:owner]-(owner:Pet)',
    'WHERE pet.uuid={uuid} AND owner.uuid={owner}',
    'DELETE r',
    'RETURN pet, owner'
  ].join('\n');
  callback(null, query, cypher_params);
};

// match with owners
var _matchWithOwners = function (params, options, callback) {
  var cypher_params = {
    uuid: params.uuid
  };

  var query = [
    'MATCH (pet:Pet)',
    'WHERE pet.uuid={uuid}',
    'WITH pet',
    'MATCH (pet)-[r?:owner]-(owner:Pet)',
    'RETURN pet, COLLECT(owner) as owners'
  ].join('\n');
  callback(null, query, cypher_params);
};


// match all with owners
var _matchAllWithOwners = function (params, options, callback) {
  var cypher_params = {};

  var query = [
    'MATCH (pet:Pet)',
    'WITH pet',
    'MATCH (pet)-[r?:owner]-(owner:Pet)',
    'RETURN pet, COLLECT(owner) as owners'
  ].join('\n');
  callback(null, query, cypher_params);
};



// exposed functions

module.exports = {
  // get a single pet by uuid
  getByUUID: Cypher(_matchByUUID, _singlePet),

  // get a single pet by name
  getByName: Cypher(_matchByName, _singlePet),

  // get a pet by uuid and update their name
  updateName: Cypher(_updateName, _singlePet),

  // create a new pet
  create: Cypher(_create, _singlePet),

  // login a pet
  login: Cypher(_create, _singlePet),

  // get all pets
  getAll: Cypher(_matchAll, _manyPets),

  // owner a pet by uuid
  ownerPet: Cypher(_owner, _singlePetWithOwner),

  // unowner a pet by uuid
  unownerPet: Cypher(_unowner, _singlePetWithOwner),

  // delete a pet by uuid
  deletePet: Cypher(_delete),

  // get a single pet by uuid and all owners
  getWithOwners: Cypher(_matchWithOwners, _singlePetWithOwners),

  // get all pets and all owners
  getAllWithOwners: Cypher(_matchAllWithOwners, _manyPetsWithOwners)
};