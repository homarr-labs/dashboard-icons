/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_632646243")

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 1,
    "name": "status",
    "presentable": true,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "approved",
      "refused",
      "pending"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_632646243")

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 1,
    "name": "status",
    "presentable": true,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "waiting_approval",
      "approved",
      "refused"
    ]
  }))

  return app.save(collection)
})
