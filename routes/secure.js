/** Koa Router serving private resources to authenticated users
 * @module routers/secure
 * @requires koa-router
 */
import Router from 'koa-router'
import { Roles } from '../modules/roles.js'
import { Helpers } from '../helpers/helpers.js'
import { OrderHelpers } from '../helpers/orderHelpers.js'
import { StatusHelpers } from '../helpers/statusHelpers.js'
import { Orders } from '../modules/orders.js'
import { OrderChoices } from '../modules/orderChoices.js'
import { MainDishes } from '../modules/mainDishes.js'
import { SideDishes } from '../modules/sideDishes.js'
const dbName = 'website.db'

/**
 * Koa Router to mount authenticated user related functions on
 * @type {Object}
 * @const
 * @namespace secureRouter
 */
const secureRouter = new Router({ prefix: '/secure' })

/**
 * The secure page.
 * @memberof module:routers/secure~secureRouter
 * @name Secure Secure Page
 * @route {GET} /
 */
secureRouter.get('/', async ctx => {
	try {
		if (ctx.hbs.authorised !== true) return ctx.redirect('/login?msg=you need to log in&referrer=/secure')
		const helper = new Helpers()

		//Calculating how many hours the current user has worked so far
		ctx.hbs.hoursWorked = await helper.getHoursWorked(ctx.hbs.loginTime)

		await ctx.render('secure', ctx.hbs)
	} catch (err) {
		ctx.hbs.error = err.message
		await ctx.render('error', ctx.hbs)
	}
})

/**
 * The script to get all roles.
 * @memberof module:routers/secure~secureRouter
 * @name Get Roles Script
 * @route {GET} /roles
 */
secureRouter.get('/roles', async ctx => {
	if (ctx.hbs.authorised !== true) return ctx.redirect('/login?msg=you need to log in&referrer=/secure')
	if (ctx.hbs.role.name !== 'admin') return ctx.redirect('/secure?msg=not an admin')

	const roles = await new Roles(dbName)
	try {
		const rows = await roles.getRoles()
		ctx.hbs.body = rows

	} catch (err) {
		ctx.hbs.error = err.message
		await ctx.render('error', ctx.hbs)
	} finally {
		roles.close()
	}
})

/**
 * The script to get all orders.
 * @memberof module:routers/secure~secureRouter
 * @name Get Orders Script
 * @route {GET} /orders
 */
secureRouter.get('/orders', async ctx => {
	if (ctx.hbs.authorised !== true) return ctx.redirect('/login?msg=you need to log in&referrer=/secure')
	const orders = await new Orders(dbName)
	const statusHelper = await new StatusHelpers()
	const WAITING_STAFF_ORDERS = 2
	const KITCHEN_STAFF_ORDERS = 1
	try {
		let rows
		if (ctx.hbs.role === 'waiting') rows = await orders.getOrders(WAITING_STAFF_ORDERS)
		else if (ctx.hbs.role === 'kitchen') rows = await orders.getOrders(KITCHEN_STAFF_ORDERS)
		else rows = await orders.getOrders()
		ctx.hbs.orders = await statusHelper.changeStatusCodesToStatusNames(rows)
		await ctx.render('orders', await ctx.hbs)
	} catch (err) {
		ctx.hbs.error = err.message
		await ctx.render('error', ctx.hbs)
	} finally {
		orders.close()
	}
})

/**
 * The order create form.
 * @memberof module:routers/secure~secureRouter
 * @name OrderCreate Page
 * @route {GET} /orders/create
 */
secureRouter.get('/orders/create', async ctx => {
	const mainDishes = await new MainDishes(dbName)
	const sideDishes = await new SideDishes(dbName)

	ctx.hbs.mainDishes = await mainDishes.getMainDishes()
	ctx.hbs.sideDishes = await sideDishes.getSideDishes()

	await ctx.render('orders-create', ctx.hbs)
})

/**
 * The script to add a new order.
 * @memberof module:routers/secure~secureRouter
 * @name Post Order Creation Script
 * @route {POST} /orders
 */
secureRouter.post('/orders/create', async ctx => {
	if (ctx.hbs.authorised !== true) return ctx.redirect('/login?msg=you need to log in&referrer=/secure')
	const orders = await new Orders(dbName)
	const orderChoices = await new OrderChoices(dbName)
	const orderHelpers = await new OrderHelpers()
	try {
		const { body } = ctx.request
		const order = await orders.addOrder(await orderHelpers.getOrderObject(body))

		for (let choice = 0; choice < body.choices.length; choice++) {
			await orderChoices.addMainDishChoice(await orderHelpers.getOrderChoiceObject(body, choice, order.lastID))
		}

		await ctx.redirect('/secure/orders?msg=order successfully created')
	} catch (err) {
		ctx.hbs.error = err.message
		await ctx.render('error', ctx.hbs)
	} finally {
		orders.close()
	}
})

/**
 * The script to update an order.
 * @memberof module:routers/secure~secureRouter
 * @name Post Order Updating Script
 * @route {POST} /orders/:id
 */
secureRouter.post('/orders/:id', async ctx => {
	if (ctx.hbs.authorised !== true) return ctx.redirect('/login?msg=you need to log in&referrer=/secure')
	const orders = await new Orders(dbName)
	const { id } = ctx.params
	const { body } = ctx.request
	try {
		await orders.updateStatus(id, body.statusCode)
		await ctx.redirect('/secure/orders?msg=order status successfully updated')
	} catch (err) {
		ctx.hbs.error = err.message
		await ctx.render('error', ctx.hbs)
	} finally {
		orders.close()
	}
})

/**
 * The order create form.
 * @memberof module:routers/secure~secureRouter
 * @name OrderCreate Page
 * @route {GET} /orders/create
 */
secureRouter.get('/dish/:id', async ctx => {
	const mainDishes = await new MainDishes(dbName)
	ctx.hbs.body = await mainDishes.getMainDish(ctx.params.id)
	await ctx.render('dish-edit', ctx.hbs)
})

/**
 * The script to update a dish.
 * @memberof module:routers/secure~secureRouter
 * @name Post Order Updating Script
 * @route {POST} /dish/:id
 */
secureRouter.post('/dish/:id', async ctx => {
	if (ctx.hbs.authorised !== true) return ctx.redirect('/login?msg=you need to log in&referrer=/secure')
	const dishes = await new MainDishes(dbName)
	const { body } = ctx.request
	body.price = parseFloat(body.price)
	body.ingredientsCost = parseFloat(body.ingredientsCost)
	try {
		await dishes.updateDish(ctx.params.id, body)
		await ctx.redirect('/secure/orders?msg=dish updated successfully updated')
	} catch (err) {
		ctx.hbs.error = err.message
		await ctx.render('error', ctx.hbs)
	} finally {
		dishes.close()
	}
})

/**
 * The script to view an order.
 * @memberof module:routers/secure~secureRouter
 * @name Post Order Viewing Script
 * @route {GET} /orders/:id
 */
secureRouter.get('/orders/:id', async ctx => {
	if (ctx.hbs.authorised !== true) return ctx.redirect('/login?msg=you need to log in&referrer=/secure')
	const orders = await new Orders(dbName)
	const statusHelper = await new StatusHelpers()
	try {
		const order = await orders.getOrder(ctx.params.id)
		ctx.hbs.body = await statusHelper.changeStatusCodeToStatusName(order)
		await ctx.render('order', await ctx.hbs)
	} catch (err) {
		ctx.hbs.error = err.message
		await ctx.render('error', ctx.hbs)
	} finally {
		orders.close()
	}
})

/**
 * The script to delete an order and the order choices associated with it.
 * @memberof module:routers/secure~secureRouter
 * @name Post Order Deleting Endpoint
 * @route {GET} /orders/delete/:id
 */
secureRouter.post('/orders/delete/:id', async ctx => {
	if (ctx.hbs.authorised !== true) return ctx.redirect('/login?msg=you need to log in&referrer=/secure')

	const orders = await new Orders(dbName)
	const orderChoices = await new OrderChoices(dbName)
	try {
		await orderChoices.deleteOrderChoices(ctx.params.id)
 		await orders.deleteOrder(ctx.params.id)
		await ctx.redirect('/secure/orders?msg=order successfully deleted')
	} catch (err) {
		ctx.hbs.error = err.message
		await ctx.render('error', ctx.hbs)
	} finally {
		orders.close()
	}
})

export { secureRouter }
