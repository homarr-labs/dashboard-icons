/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_632646243")

  // Update the updateRule to allow authenticated users to overwrite rejected submissions
  // Users can update if they are the creator, an admin, or if the submission is rejected and they're authenticated
  collection.updateRule = "@request.auth.id = created_by.id || @request.auth.admin = true || (@request.auth.id != '' && status = 'rejected')"

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_632646243")

  // Revert to original updateRule
  collection.updateRule = "@request.auth.id = created_by.id || @request.auth.admin = true"

  return app.save(collection)
})
