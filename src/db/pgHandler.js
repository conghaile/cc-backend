import { timeframeMap } from '../coin_logic/constants.js'
import { newPassword, verifyPassword } from '../auth/Password.js'

class PgHandler{
    constructor(client, table) {
        this.client = client
        this.table = table
    }

    async last24hours() {
        let query = `SELECT coin, COUNT(coin) FROM ${this.table} WHERE time > (SELECT EXTRACT(epoch from now())) - 604800 GROUP BY coin HAVING COUNT(coin) > 4 ORDER BY COUNT DESC;`
        let result = await this.client.query({
            rowMode: 'array',
            text: query
        })
        return result.rows
    }

    async mentions(coin, timeframe) {
        let query
        if (timeframe === "max") {
            query = `SELECT coin, time FROM ${this.table} WHERE coin = '${coin}'`
        }
        else {
            query = `SELECT coin, time FROM ${this.table} WHERE coin = '${coin}' AND time > (SELECT EXTRACT(epoch from now())) - ${timeframeMap[timeframe]}`
        }
        
        let result = await this.client.query({
            rowMode: 'array',
            text: query
        })
        return result.rows
    }

    async search(searchTerm) {
        let query = `SELECT DISTINCT coin FROM ${this.table} WHERE coin LIKE '${searchTerm}%'`
        let result = await this.client.query({
            rowMode: 'array',
            text: query
        })
        return result.rows
    }

    async newUser(email, password) {
        let query = `SELECT * FROM users WHERE email = '${email}'`
        let result = await this.client.query({
            rowMode: 'array',
            text: query
        })
        if (result.rows.length == 0) {
            const encrypted = await newPassword(password)
            let query = `INSERT INTO users VALUES('${email}', '${encrypted}')`
            let result = await this.client.query({
                text: query
            })
            return 1
        } else {
            return 0
        }
    }
}

export default PgHandler