import express from 'express';
import dotenv from 'dotenv';
import pkg from 'pg';
import PgHandler from './db/pgHandler.js'
import cors from 'cors';
import { timeframeMap, bucketizeMap } from './coin_logic/constants.js'
import bucketize from './coin_logic/bucketize.js'
import bodyParser from 'body-parser'
import { newSession } from './auth/Session.js'
import { createClient } from 'redis'
import cookieParser from 'cookie-parser'
const { Client } = pkg;

const redisClient = createClient()
redisClient.on('error', err => console.log('Redis Client Error:', err))
await redisClient.connect()

dotenv.config()

const app = express()

const checkSession = async (req, res, next) => {
    const cookie = req.cookies.SESSION_ID
    if (cookie !== undefined) {
        const email = await redisClient.get(cookie)
        if (email !== null) {
            req.email = email
            req.loggedIn = true
        } else {
            req.loggedIn = false
            
        }
    } else {
        req.loggedIn = false
    }
    next()
}

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}))
app.use(bodyParser.urlencoded({
    extended: false,
}))
app.use(bodyParser.json())
app.use(cookieParser())
app.use(checkSession)

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

app.post('/native-login', async (req, res) => {
    const handler = new PgHandler(client, TABLE)
    const result = await handler.login(req.body.email, req.body.password)
    if (result) {
        // Generate and store session token
        const sessionToken = await newSession(req.body.email, redisClient)
        // Send session token in response
        res.cookie('SESSION_ID', sessionToken, {
            maxAge: 604800000,
            sameSite: 'none',
            secure: true
        })
        res.sendStatus(200)
    } else {
        res.sendStatus(401)
    }
})

app.post('/native-signup', async (req, res) => {
    const handler = new PgHandler(client, TABLE)
    const result = await handler.newUser(req.body.email, req.body.password)
    if (result == 1) {
        //Generate and store session token
        const sessionToken = await newSession(req.body.email, redisClient)
        res.cookie('SESSION_ID', sessionToken, {
            maxAge: 604800000,
            
        })
        res.sendStatus(200)
    } else {
        res.sendStatus(401)
    }
})

app.get('/logout', async (req, res) => {
    if (req.loggedIn) {
        await redisClient.hDel(req.cookies.SESSION_ID)
    }
    res.sendStatus(200)
})

app.get('/ensure-login', async (req, res) => {
    if (req.loggedIn) {
        res.json({
            email: req.email
        })
    } else {
        res.sendStatus(401)
    }
})

app.listen(PORT)
console.log("Listening on port", PORT, "...")
