onRecordCreate((e) => require(`${__hooks}/dashboard.js`).audit(e, true), "submissions")
onRecordUpdate((e) => require(`${__hooks}/dashboard.js`).audit(e, false), "submissions")
onRecordDelete((e) => require(`${__hooks}/dashboard.js`).deleteRecord(e), "submissions")
onRecordCreateRequest((e) => require(`${__hooks}/dashboard.js`).guard(e, true), "submissions")
onRecordUpdateRequest((e) => require(`${__hooks}/dashboard.js`).guard(e, false), "submissions")
onRecordDeleteRequest((e) => {
	if (require(`${__hooks}/dashboard.js`).reserved(e.app, e.record.id)) throw new BadRequestError("Submission is being published")
	e.next()
}, "submissions")
routerAdd("GET", "/api/dashboard/summary", (e) => require(`${__hooks}/dashboard.js`).summary(e), $apis.requireAuth())
routerAdd("POST", "/api/dashboard/review", (e) => require(`${__hooks}/dashboard.js`).review(e), $apis.requireAuth())
routerAdd(
	"POST",
	"/api/dashboard/publish/{id}/result",
	(e) => {
		if (!e.hasSuperuserAuth()) throw new ForbiddenError("Workflow credentials required")
		return e.json(200, require(`${__hooks}/dashboard.js`).updateBatch(e.app, e.request.pathValue("id"), e.requestInfo().body))
	},
	$apis.requireAuth(),
)
routerAdd("POST", "/api/dashboard/publish/dispatch", (e) => require(`${__hooks}/dashboard.js`).dispatch(e), $apis.requireAuth())
routerAdd("POST", "/api/dashboard/publish/reconcile", (e) => require(`${__hooks}/dashboard.js`).reconcile(e), $apis.requireAuth())
