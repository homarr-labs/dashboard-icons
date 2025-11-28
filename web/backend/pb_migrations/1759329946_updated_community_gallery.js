/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2668482079")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT id, name, status, assets FROM submissions"
  }, collection)

  // remove field
  collection.fields.removeById("_clone_Vsov")

  // remove field
  collection.fields.removeById("_clone_KD7P")

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_Qk1t",
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
    "id": "_clone_ki4I",
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
    "id": "_clone_PpoB",
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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2668482079")

  // update collection data
  unmarshal({
    "viewQuery": "SELECT id, name, status FROM submissions"
  }, collection)

  // add field
  collection.fields.addAt(1, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "_clone_Vsov",
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
    "id": "_clone_KD7P",
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

  // remove field
  collection.fields.removeById("_clone_Qk1t")

  // remove field
  collection.fields.removeById("_clone_ki4I")

  // remove field
  collection.fields.removeById("_clone_PpoB")

  return app.save(collection)
})
