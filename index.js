import Koa from 'koa'
import serve from 'koa-static'
import views from 'koa-views'
import session from 'koa-session'

import { apiRouter } from './routes/routes.js'

const app = new Koa()
app.keys = ['darkSecret']

const defaultPort = 8080
const port = process.env.PORT || defaultPort

app.use(serve('public'))
app.use(session(app))
app.use(views('views', { map: { handlebars: 'handlebars' }, extension: 'handlebars' ,
	options: { helpers: { ifCond: (v1, v2, options) => {
		if(v1 === v2) {
			return options.fn(this)
		} return options.inverse(this)
	},
	json: (value) => JSON.stringify(value)}}}))

app.use( async(ctx, next) => {
	console.log(`${ctx.method} ${ctx.path}`)
	ctx.hbs = {
		authorised: ctx.session.authorised,
		loginTime: ctx.session.loginTime,
		role: ctx.session.role,
		host: `https://${ctx.host}`
	}
	for(const key in ctx.query) ctx.hbs[key] = ctx.query[key]
	await next()
})

app.use(apiRouter.routes(), apiRouter.allowedMethods())

app.listen(port, async() => console.log(`listening on port ${port}`))
