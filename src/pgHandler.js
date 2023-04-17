import { timeframeMap } from './constants.js'

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
}

export default PgHandler