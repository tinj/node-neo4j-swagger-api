module.exports = {
  "Category":{
    "id":"Category",
    "properties":{
      "id":{
        "type":"string"
      },
      "name":{
        "type":"string"
      }
    }
  },
  "Count":{
    "id":"Count",
    "properties": {
      "count":{
        "type":"integer"
      }
    }
  },
  "Pet":{
    "id":"Pet",
    "properties":{
      // "tags":{
      //   "items":{
      //     "$ref":"Tag"
      //   },
      //   "type":"Array"
      // },
      "id":{
        "type":"string"
      },
      // "category":{
      //   "items": {
      //     "$ref":"Category"
      //   }
      // },
      // "status":{
      //   "allowableValues":{
      //     "valueType":"LIST",
      //     "values":[
      //       "available",
      //       "pending",
      //       "sold"
      //     ],
      //     "valueType":"LIST"
      //   },
      //   "description":"pet status in the store",
      //   "type":"string"
      // },
      "name":{
        "type":"string"
      }
      // "photoUrls":{
      //   "items":{
      //     "type":"string"
      //   },
      //   "type":"Array"
      // }
    }
  },
  "User":{
    "id":"User",
    // "required": ["id"],
    "properties":{
      "id":{
        "type":"string",
        "description": "UUID"
      },
      "name":{
        "type":"string",
        "description": "Name of User"
      },
      "created":{
        "type":"integer",
        "description":"Unix Time Created"
      }
    }
  },
  "newUser":{
    "id":"newUser",
    "required": ["name"],
    "properties":{
      "name":{
        "type":"string",
      }
    }
  },
  "Tag":{
    "id":"Tag",
    "properties":{
      "id":{
        "type":"long"
      },
      "name":{
        "type":"string"
      }
    }
  }
};