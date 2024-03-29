import bcrypt from 'bcrypt-promise'
import sqlite from 'sqlite-async'

const saltRounds = 10

/**
 *
 *
 * @class models/Accounts
 */
class Accounts {

	/**
	 * Creates an instance of Accounts.
	 * @param {string} [dbName=':memory:']
	 * @function
	 * @memberof models/Accounts
	 */
	constructor(dbName = ':memory:') {
		return (async() => {
			this.db = await sqlite.open(dbName)
			// we need this table to store the user accounts
			const sql =
        'CREATE TABLE IF NOT EXISTS users\
		(id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, pass TEXT, email TEXT, roleID INTEGER, \
        CONSTRAINT fk_roleid \
        FOREIGN KEY (roleID) \
        REFERENCES roles(id) \
        );'
			await this.db.run(sql)
			return this
		})()
	}


	/**
	 *
	 * @param {String} user provided username
	 * @param {String} pass provided password
	 * @param {String} email provided email
	 * @return {Boolean} true if registration succeeds
	 * @memberof models/Accounts
	 */
	async register(user, pass, email) {
		Array.from(arguments).forEach( val => {
			if(val.length === 0) throw new Error('missing field')
		})
		const defaultRoleId = 4
		let sql = `SELECT COUNT(id) as records FROM users WHERE user="${user}";`
		const data = await this.db.get(sql)
		if(data.records !== 0) throw new Error(`username "${user}" already in use`)
		sql = `SELECT COUNT(id) as records FROM users WHERE email="${email}";`
		const emails = await this.db.get(sql)
		if(emails.records !== 0) throw new Error(`email address "${email}" is already in use`)
		pass = await bcrypt.hash(pass, saltRounds)
		sql = `INSERT INTO users(user, pass, email, roleID) VALUES("${user}", "${pass}", "${email}", ${defaultRoleId})`
		await this.db.run(sql)
		return true
	}

	/**
	 * checks to see if a set of login credentials are valid
	 * @param {String} username the username to check
	 * @param {String} password the password to check
	 * @return {Boolean} returns true if credentials are valid
	 * @memberof models/Accounts
	 */
	async login(username, password) {
		let sql = `SELECT count(id) AS count FROM users WHERE user="${username}";`
		const records = await this.db.get(sql)
		if(!records.count) throw new Error(`username "${username}" not found`)
		sql = `SELECT pass FROM users WHERE user = "${username}";`
		const record = await this.db.get(sql)
		const valid = await bcrypt.compare(password, record.pass)
		if(valid === false) throw new Error(`invalid password for account "${username}"`)
		return true
	}

	/**
	 * gets user's role ID
	 * @param {String} username the username to check
	 * @returns {Integer} returns roleID if credentials are valid
	 * @memberof models/Accounts
	 */
	async getRoleID(username) {
		let sql = `SELECT count(id) AS count FROM users WHERE user="${username}";`
		const record = await this.db.get(sql)
		if(!record.count) throw new Error(`username "${username}" not found`)
		sql = `SELECT roleID FROM users WHERE user = "${username}";`
		const row = await this.db.get(sql)
		return row.roleID
	}

	/**
	 * closes the connection to SQLite database
	 * @memberof models/Accounts
	 */
	async close() {
		await this.db.close()
	}
}

export { Accounts }
