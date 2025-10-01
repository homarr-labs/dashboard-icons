/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "passwordAuth": {
      "identityFields": [
        "username",
        "email"
      ]
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "passwordAuth": {
      "identityFields": [
        "username"
      ]
    }
  }, collection)

  return app.save(collection)
})
