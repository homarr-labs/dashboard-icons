/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2668482079")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT s.id,\n       s.name,\n       s.status,\n       s.assets,\n       s.updated,\n       s.created,\n       s.extras,\n       u.username AS created_by\nFROM submissions s\nJOIN users u ON s.created_by = u.id;"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_vRXF")

  // remove field
  collection.fields.removeById("_clone_I7rz")

  // remove field
  collection.fields.removeById("_clone_yLLt")

  // remove field
  collection.fields.removeById("_clone_NzXr")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_Jwk2",
    "max": 128,
    "min": 0,
    "name": "name",
    "pattern": "",
    "presentable": true,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "_clone_5hwn",
    "maxSelect": 1,
    "name": "status",
    "presentable": true,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "approved",
      "pending",
      "rejected",
      "added_to_collection"
    ]
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "_clone_EUTS",
    "maxSelect": 99,
    "maxSize": 0,
    "mimeTypes": [
      "image/png",
      "image/svg+xml"
    ],
    "name": "assets",
    "presentable": false,
    "protected": false,
    "required": true,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "_clone_XtYJ",
    "name": "updated",
    "onCreate": true,
    "onUpdate": true,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "_clone_cSF4",
    "name": "created",
    "onCreate": true,
    "onUpdate": false,
    "presentable": false,
    "system": false,
    "type": "autodate"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "_clone_SoU0",
    "maxSize": 0,
    "name": "extras",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_OlCN",
    "max": 255,
    "min": 5,
    "name": "created_by",
    "pattern": "",
    "presentable": true,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2668482079")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT s.id,\n       s.name,\n       s.status,\n       s.assets,\n       u.username AS created_by\nFROM submissions s\nJOIN users u ON s.created_by = u.id;"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_vRXF",
    "max": 128,
    "min": 0,
    "name": "name",
    "pattern": "",
    "presentable": true,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "_clone_I7rz",
    "maxSelect": 1,
    "name": "status",
    "presentable": true,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "approved",
      "pending",
      "rejected",
      "added_to_collection"
    ]
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "_clone_yLLt",
    "maxSelect": 99,
    "maxSize": 0,
    "mimeTypes": [
      "image/png",
      "image/svg+xml"
    ],
    "name": "assets",
    "presentable": false,
    "protected": false,
    "required": true,
    "system": false,
    "thumbs": [],
    "type": "file"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_NzXr",
    "max": 255,
    "min": 5,
    "name": "created_by",
    "pattern": "",
    "presentable": true,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("_clone_Jwk2")

  // remove field
  collection.fields.removeById("_clone_5hwn")

  // remove field
  collection.fields.removeById("_clone_EUTS")

  // remove field
  collection.fields.removeById("_clone_XtYJ")

  // remove field
  collection.fields.removeById("_clone_cSF4")

  // remove field
  collection.fields.removeById("_clone_SoU0")

  // remove field
  collection.fields.removeById("_clone_OlCN")

  return app.save(collection)
})
