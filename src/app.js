import express, {json} from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import dotenv from 'dotenv';

dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect()
.then(() => db = mongoClient.db())
.catch((err) => console.log(err.message));

const app = express();
app.use(json());
app.use(cors());

app.post("/participants", async (req, res) => {

    try {

        const { name } = req.body;

        if (!name) {
            return res.sendStatus(422);
        }

        const userDB = await db.collection("users").findOne({name: name});

        /* Check if user exists in database */
        if (userDB) {
            return res.sendStatus(409);
        }

        await db.collection("users").insertOne({
            name: name,
            lastStatus: Date.now()
        });
    
        await db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        });

        res.sendStatus(201);

    } catch (err) {
        res.status(500).send(err.message);
    }
})

app.get("/participants", async (req, res) => {

    try {

        const usersDB = await db.collection("users").find().toArray();
        res.send(usersDB);

    } catch (err) {
        res.status(500).send(err.message);
    }
})

app.post("/messages", async (req, res) => {

    try {

        const { to, text, type } = req.body;
        const { user } = req.headers;

        if (!to || !text || !type) {
            return res.sendStatus(422);
        }

        if (type !== "message" && type !== "private_message") {
            console.log("ok");
            return res.sendStatus(422);
        }

        const userDB = await db.collection("users").findOne({name: user});

        /* Check if user exists in database */
        if (!userDB) {
            return res.sendStatus(422);
        }

        await db.collection("messages").insertOne({
            from: user,
            to: to,
            text: text,
            type: type,
            time: dayjs().format('HH:mm:ss')
        });

        res.sendStatus(201);

    } catch (err) {
        res.status(500).send(err.message);
    }
})

app.get("/messages", async (req, res) => {

    try {

        const { user } = req.headers;
        let { limit } = req.query;

        let messagesDB;
        
        /* No query param limit given => get all messages from database */
        if (!limit) {
            messagesDB = await db.collection("messages").find().toArray();

        } else {

            limit = Number(limit);

            if (limit <= 0 || !limit) {
                return res.sendStatus(422);
            }

            messagesDB = await db.collection("messages").find().limit(limit).toArray();
        }

        const requestMessages = [];
        messagesDB.forEach((message) => {

            if (message.to === "Todos" || message.to === user || message.from === user) {
                requestMessages.push({...message});
            }
        });

        res.status(200).send(requestMessages);

    } catch (err) {
        res.status(500).send(err.message);
    }
})

app.post("/status", async (req, res) => {

    try {

        const { user } = req.headers;

        if (!user) {
            return res.send(404);
        }

        const userDB = await db.collection("users").findOneAndUpdate({name: user}, {$set:{lastStatus: Date.now()}});

        if (!userDB.value) {
            return res.sendStatus(404);
        }

        res.sendStatus(200);

    } catch (err) {
        res.status(500).send(err.message);
    }
})

app.listen(process.env.PORT);