/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id = created_by.id || @request.auth.admin = true",
    "deleteRule": "@request.auth.id = created_by.id || @request.auth.admin = true",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1579384326",
        "max": 128,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "file2043772302",
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
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation3725765462",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "created_by",
        "presentable": true,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
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
      },
      {
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
      },
      {
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
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_632646243",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_vB4iK1BfdV` ON `submission` (`name`)"
    ],
    "listRule": "@request.auth.id = created_by.id || @request.auth.admin = true",
    "name": "submission",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id = created_by.id || @request.auth.admin = true",
    "viewRule": "@request.auth.id = created_by.id || @request.auth.admin = true"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_632646243");

  return app.delete(collection);
})
