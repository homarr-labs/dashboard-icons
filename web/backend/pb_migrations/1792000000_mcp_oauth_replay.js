migrate(
	(app) => {
		app.db().newQuery("CREATE TABLE mcp_oauth_replay (purpose TEXT NOT NULL CHECK (purpose IN ('code', 'refresh')), id TEXT NOT NULL, expires_at INTEGER NOT NULL, PRIMARY KEY (purpose, id)) WITHOUT ROWID").execute()
		app.db().newQuery("CREATE INDEX idx_mcp_oauth_replay_expiry ON mcp_oauth_replay (expires_at)").execute()
	},
	(app) => {
		app.db().newQuery("DROP TABLE mcp_oauth_replay").execute()
	},
)
