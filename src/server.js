import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';
import PgHandler from './pgHandler.js'
import cors from 'cors';
import { timeframeMap, bucketizeMap } from './constants.js'
import bucketize from './helpers.js'
const { Client } = pkg;

dotenv.config()

const app = express()
app.use(cors({
    origin: 'http://localhost:3000'
}))

const PORT = Number(process.env.PORT)
const TABLE = process.env.TABLE
const client = new Client({
    user: process.env.DBUSER,
    host: process.env.DBHOST,
    database: process.env.DB,
    password: process.env.DBPASSWORD,
    port: Number(process.env.DBPORT)
})
client.connect()

app.get('/coins', async (req, res) => {
    
    const handler = new PgHandler(client, TABLE)
    const result = await handler.last24hours()
    res.send(result)
})

app.get('/mentions', async (req, res) => {
    const coin = req.query.coin
    const timeframe = req.query.timeframe
    const handler = new PgHandler(client, TABLE)
    const result = await handler.mentions(coin, timeframe)
    const bucketized = bucketize(result, timeframe)

    res.send(bucketized)
})

app.get('/search', async (req, res) => {
    const searchTerm = req.query.search
    const handler = new PgHandler(client, TABLE)
    const result = await handler.search(searchTerm)
    res.send(result)
})

app.listen(PORT)
console.log("Listening on port", PORT, "...")
