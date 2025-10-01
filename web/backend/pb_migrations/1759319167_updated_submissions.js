/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_632646243")

  // remove field
  collection.fields.removeById("json989021800")

  // update field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "json1595063097",
    "maxSize": 0,
    "name": "extras",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_632646243")

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "json989021800",
    "maxSize": 0,
    "name": "categories",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // update field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "json1595063097",
    "maxSize": 0,
    "name": "aliases",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
})
