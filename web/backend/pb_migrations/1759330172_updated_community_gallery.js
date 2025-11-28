/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2668482079")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT s.id,\n       s.name,\n       s.status,\n       s.assets,\n       s.created_by,\n       u.username\nFROM submissions s\nJOIN users u ON s.created_by = u.id;"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_60Zn")

  // remove field
  collection.fields.removeById("_clone_NQSW")

  // remove field
  collection.fields.removeById("_clone_CEqL")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_PVgQ",
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
    "id": "_clone_Pydh",
    "maxSelect": 1,
    "name": "status",
    "presentable": true,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "approved",
      "pending",
      "rejected"
    ]
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "_clone_IDgw",
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
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "_clone_PcJq",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "created_by",
    "presentable": true,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_Wpjd",
    "max": 255,
    "min": 5,
    "name": "username",
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
    "viewQuery": "SELECT id, name, status, assets FROM submissions"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_60Zn",
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
    "id": "_clone_NQSW",
    "maxSelect": 1,
    "name": "status",
    "presentable": true,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "approved",
      "pending",
      "rejected"
    ]
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "_clone_CEqL",
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

  // remove field
  collection.fields.removeById("_clone_PVgQ")

  // remove field
  collection.fields.removeById("_clone_Pydh")

  // remove field
  collection.fields.removeById("_clone_IDgw")

  // remove field
  collection.fields.removeById("_clone_PcJq")

  // remove field
  collection.fields.removeById("_clone_Wpjd")

  return app.save(collection)
})
