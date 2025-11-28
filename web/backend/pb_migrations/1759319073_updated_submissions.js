/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_632646243")

  // remove field
  collection.fields.removeById("text1595063097")

  // remove field
  collection.fields.removeById("text989021800")

  // add field
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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_632646243")

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text1595063097",
    "max": 0,
    "min": 0,
    "name": "aliases",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text989021800",
    "max": 0,
    "min": 0,
    "name": "categories",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("json1595063097")

  // remove field
  collection.fields.removeById("json989021800")

  return app.save(collection)
})
