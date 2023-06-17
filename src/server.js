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
import { MailService } from '@sendgrid/mail'
import { sendVerification } from './auth/Email.js'

//Init environment variables
dotenv.config()

//Init redis, pg, and sendgrid clients
const redisClient = createClient()
redisClient.on('error', err => console.log('Redis Client Error:', err))
await redisClient.connect()

const PORT = Number(process.env.PORT)
const DBASE = process.env.DBASE
const client = new Client({
    user: process.env.DBUSER,
    host: process.env.DBHOST,
    database: process.env.DB,
    password: process.env.DBPASSWORD,
    port: Number(process.env.DBPORT)
})
client.connect()

const postgresHandler = new PgHandler(client, DBASE)

const sgClient = new MailService()
sgClient.setApiKey(process.env.SGKEY)

//Middleware that checks whether user is logged in or not by reading the cookie
const checkSession = async (req, res, next) => {
    const cookie = req.cookies.SESSION_ID
    console.log(cookie)
    if (cookie !== undefined) {
        if (cookie !== "PENDING_VERIFICATION") {
            const email = await redisClient.get(cookie)
            if (email !== null) {
                req.email = email
                req.loggedIn = true
            } else {
                req.loggedIn = false
            }
        } else {
            req.pending = true
        }
        
    } else {
        req.loggedIn = false
    }
    next()
}

// Init express app and set middleware
const app = express()

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



app.get('/coins', async (req, res) => {
    const result = await postgresHandler.testAll()
    // const result = await postgresHandler.last24hours()
    res.send(result)
})

app.get('/mentions', async (req, res) => {
    const coin = req.query.coin
    const timeframe = req.query.timeframe
    
    const result = await postgresHandler.mentions(coin, timeframe)
    const bucketized = bucketize(result, timeframe)

    res.send(bucketized)
})

app.get('/search', async (req, res) => {
    const searchTerm = req.query.search
    
    const result = await postgresHandler.search(searchTerm)
    res.send(result)
})

app.post('/native-login', async (req, res) => {
    if (req.loggedIn === false) {
        
        const result = await postgresHandler.login(req.body.email, req.body.password)
        console.log(result)
        switch(result) {
            //Incorrect password
            case 0:
                res.sendStatus(401)
                break
            //Success
            case 1:
                console.log("Success!")
                const sessionToken = await newSession(req.body.email, redisClient)
                res.cookie('SESSION_ID', sessionToken, {
                    maxAge: 604800000,
                    sameSite: 'none',
                    secure: true,
                })
                res.sendStatus(200)
                break
            //Account still unverified
            case 2:
                res.sendStatus(403)
                break
            //No account exists with given email
            case 3:
                res.sendStatus(404)
            
        }
    }
    else {
        res.sendStatus(403)
    }
})

app.post('/native-signup', async (req, res) => {
    
    //Create new session token for verification email
    const sessionToken = await newSession(req.body.email, redisClient, 86400)
    //Try sending email
    const sent = await sendVerification(req.body.email, sgClient, sessionToken)
    if (sent !== null) {
        //If email fails, delete session token from redis and send error response
        await redisClient.del(sessionToken)
        res.sendStatus(502)
    } else {
        const result = await postgresHandler.newUser(req.body.email, req.body.password)
        if (result !== 1) {
            //If account already exists, send error response
            res.sendStatus(401)
        } else {
            //Set client cookie to indicate pending verification
            res.cookie('SESSION_ID', 'PENDING_VERIFICATION', {
                maxAge: 86400000,
                sameSite: 'none',
                secure: true,
            })
            res.sendStatus(200)
        }
    }
})

app.get('/verify-user', async (req, res) => {
    //Definitely need to handle each else differently but I can't be fucked right now
    
    const token = req.query.token
    if (token !== null) {
        
        const email = await redisClient.get(token)
        
        if (email !== null) {
            await redisClient.del(token)
            const result = await postgresHandler.verifyUser(email)
            if (result === 1) {
                const newToken = await newSession(email, redisClient, 604800)
                
                res.cookie('SESSION_ID', newToken, {
                    maxAge: 604800000,
                    sameSite: 'none',
                    secure: true,
                })
                res.sendStatus(200)
            //If email somehow disappears from DB after initial signup
            } else {
                res.sendStatus(502)
            }
        //If verification token expired
        } else {
            res.sendStatus(404)
        }
    //If no token in URL
    } else {
        res.sendStatus(400)
    }
})

app.get('/logout', async (req, res) => {
    if (req.loggedIn) {
        await redisClient.del(req.cookies.SESSION_ID)
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

app.get('/favorites', async (req, res) => {
    if (req.loggedIn) {
        const result = await postgresHandler.getFavorites(req.email)
        if (result !== null) {
            res.send({"coins": JSON.parse(result)})
        } else {
            res.send({"coins": []})
        }
    } else {
        res.sendStatus(403)
    }
})

app.post('/favorites', async (req, res) => {
    if (req.loggedIn) {
        const coin = req.body.coin
        const email = req.email
        
        const result = await postgresHandler.addFavorite(email, coin)
        res.send({"coin": result})
    } else {
        res.sendStatus(403)
    }
    
})

app.delete('/favorites', async (req, res) => {
    
    if (req.loggedIn) {
        const coin = req.query.coin
        const email = req.email
        
        const result = await postgresHandler.deleteFavorite(email, coin)
        if (result !== 0) {
            res.send({"coin": result})
        } else {
            res.sendStatus(404)
        }
        
    } else {
        res.sendStatus(403)
    }
    
})

app.listen(PORT)
console.log("Listening on port", PORT, "...")
