migrate(
	(app) => {
		const settings = app.settings()
		settings.batch.enabled = true
		settings.batch.maxRequests = 12
		settings.batch.timeout = 10
		settings.batch.maxBodySize = 64 * 1024 * 1024
		app.save(settings)
	},
	(app) => {
		const settings = app.settings()
		settings.batch.enabled = false
		settings.batch.maxRequests = 50
		settings.batch.timeout = 3
		settings.batch.maxBodySize = 0
		app.save(settings)
	},
)
