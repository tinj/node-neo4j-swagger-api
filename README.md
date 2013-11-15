node-neo4j-swagger-api
=====================

This is an open source node neo4j api server based on node-neo4j-template and swagger-node-express

The idea is to make it as easy as possible to create an api using node and neo4j that can be consumed by some other app. Swagger provides interactive documentation so that it is easy to interact with the API. The goal is merge swagger and neo4j gist together (vizualizations!) so developers can see how neo4j and the api calls relate to each other.

node-neo4j-template
https://github.com/aseemk/node-neo4j-template/


Swagger-Node-Express
https://github.com/wordnik/swagger-node-express

graphgist
https://github.com/neo4j-contrib/graphgist/


Built focusing on using Cypher and Neo4j 2.0M06


TODO

1. Move neo4j queries and results to swagger client
2. Add graph visualization to swagger
3. improve swagger model format
4. pull out neo4j-swagger client, cypher helpers, and mixins into separate modules
5. finish implementing basic queries for users
6. add second node type (pets?)
7. add queries relating users and pets
8. TESTS!!!
9. ...




MIT License