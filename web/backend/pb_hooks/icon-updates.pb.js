routerAdd("GET", "/api/icon-updates/target", (e) => require(`${__hooks}/icon-updates.js`).load(e), $apis.requireAuth())
