import { timeframeMap } from '../coin_logic/constants.js'
import { newPassword, verifyPassword } from '../auth/Password.js'

class PgHandler{
    constructor(client, table) {
        this.client = client
        this.table = table
    }

    async testAll() {
        let query = `SELECT coin, COUNT(coin) FROM ${this.table} WHERE time > 0 GROUP BY coin HAVING COUNT(coin) > 4 ORDER BY COUNT DESC;`
        let result = await this.client.query({
            rowMode: 'array',
            text: query
        })
        return result.rows
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
            let query = `INSERT INTO users VALUES('${email}', '${encrypted}', '0')`
            await this.client.query({
                text: query
            })
            query = `INSERT INTO user_favorites VALUES('${email}', NULL)`
            return 1
        } else {
            return 0
        }
    }

    async login(email, password) {
        // Returns 0 if password is incorrect, 1 if successful, 2 if account is unverified, 3 if no account exists with given email
        let query = `SELECT * FROM users WHERE email = '${email}'`
        let result = await this.client.query({
            rowMode: 'array',
            text: query
        })
        
        if (result.rowCount === 0) {
            return 3
        }
        let verified = result.rows[0][2]
        if (!verified) {
            return 2
        }
        let encrypted = result.rows[0][1]
        if (!await verifyPassword(password, encrypted)) {
            return 0
        }
        return 1
    }

    async verifyUser(email) {
        let query = `UPDATE users SET verified = '1' WHERE email = '${email}'`
        let result = await this.client.query({
            text: query,
            rowMode: 'array'
        })
        if (result.rowCount !== 1) {
            return 0
        }
        return 1
    }

    async getFavorites(email) {
        let query = `SELECT favorites FROM user_favorites WHERE email = '${email}'`
        let result = await this.client.query({
            text: query,
            rowMode: 'array'
        })
        console.log(result)
        return result.rows[0][0]
    }

    async addFavorite(email, coin) {
        let currentFavs = await this.getFavorites(email)
        console.log(currentFavs)
        if (currentFavs === null) {
            currentFavs = [coin]
        } else {
            currentFavs = JSON.parse(currentFavs)
            currentFavs.push(coin)
        }
        let newFavs = JSON.stringify(currentFavs)
        console.log(newFavs)
        
        let query = `UPDATE user_favorites SET favorites = '${newFavs}' WHERE email = '${email}'`
        let result = await this.client.query({
            text: query
        })
        
        return coin
    }

    async deleteFavorite(email, coin) {
        
        const currentFavs = await this.getFavorites(email)
        if (currentFavs !== null) {
            let newFavs = JSON.parse(currentFavs).filter(fav => fav !== coin)
            let query
            if (newFavs.length > 0) {
                query = `UPDATE user_favorites SET favorites = '${JSON.stringify(newFavs)}' WHERE email = '${email}'`
            } else {
                query = `UPDATE user_favorites SET favorites = NULL WHERE email = '${email}'`
            }
            
            let result = await this.client.query({
                text: query
            })
            
            return coin
        }
        return 0
    }
}

export default PgHandler