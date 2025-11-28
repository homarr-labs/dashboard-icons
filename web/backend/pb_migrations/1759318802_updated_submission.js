/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_632646243")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_vB4iK1BfdV` ON `submissions` (`name`)"
    ],
    "name": "submissions"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_632646243")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_vB4iK1BfdV` ON `submission` (`name`)"
    ],
    "name": "submission"
  }, collection)

  return app.save(collection)
})
