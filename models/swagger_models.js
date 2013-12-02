module.exports = {
  "Envelope":{
    "id":"Envelope",
    "properties":{
      "response":[
        "User",
        "Pet",
        "List[User]",
        "List[Pet]",
      ],
      "responseTime":"integer",
      "name":{
        "type":"string"
      }
    }
  },
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
        "type":"string"
      },
      "name":{
        "type":"string"
      },
      "created":{
        "type":"number"
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