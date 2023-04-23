import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';
import PgHandler from './db/pgHandler.js'
import cors from 'cors';
import { timeframeMap, bucketizeMap } from './coin_logic/constants.js'
import bucketize from './coin_logic/bucketize.js'
import bodyParser from 'body-parser'
const { Client } = pkg;

dotenv.config()

const app = express()
app.use(cors({
    origin: 'http://localhost:3000'
}))
app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json())

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

app.post('/login', async (req, res) => {
    console.log(req.body)
    res.sendStatus(200)
})

app.post('/native-signup', async (req, res) => {
    console.log(req.body)
    res.sendStatus(200)
})

app.listen(PORT)
console.log("Listening on port", PORT, "...")
