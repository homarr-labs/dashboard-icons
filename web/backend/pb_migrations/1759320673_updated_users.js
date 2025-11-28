/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "@request.body.admin = false || @request.body.admin = null",
    "updateRule": "id = @request.auth.id && (@request.body.admin = false || @request.body.admin = admin)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "createRule": "",
    "updateRule": "id = @request.auth.id && (@request.body.admin = null || @request.body.admin = admin)"
  }, collection)

  return app.save(collection)
})
