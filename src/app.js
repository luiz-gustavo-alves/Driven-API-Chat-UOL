import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import dotenv from 'dotenv';

dotenv.config()

const app = express();
app.use(express.json());
app.use(cors());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
async () => {

    try {
        await mongoClient.connect();
    }
    catch (err) {
        console.log(err.message);
    }
}

const db = mongoClient.db();

app.post("/participants", async (req, res) => {

    try {

        const { name } = req.body;

        if ((!name) || (typeof name !== "string")) {
            return res.sendStatus(422);
        }

        const participantDB = await db.collection("participants").findOne({name: name});

        /* Check if participant exists in database */
        if (participantDB) {
            return res.sendStatus(409);
        }

        await db.collection("participants").insertOne({
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

        const participantsDB = await db.collection("participants").find().toArray();
        res.send(participantsDB);

    } catch (err) {
        res.status(500).send(err.message);
    }
})

app.post("/messages", async (req, res) => {

    try {

        const { to, text, type } = req.body;
        const { user } = req.headers;

        if ((!to || !text || !type) || (typeof to !== "string" || typeof text !== "string" || typeof type !== "string")) {
            return res.sendStatus(422);
        }

        if (type !== "message" && type !== "private_message") {
            return res.sendStatus(422);
        }

        const participantDB = await db.collection("participants").findOne({name: user});

        /* Check if participant exists in database */
        if (!participantDB) {
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

        const userDB = await db.collection("participants").findOneAndUpdate(
        { name: user }, 
        { $set: 
            { lastStatus: Date.now() }
        });

        if (!userDB.value) {
            return res.sendStatus(404);
        }

        res.sendStatus(200);

    } catch (err) {
        res.status(500).send(err.message);
    }
})

setInterval(async () => {

    try {
        
        const timeLimit = 10000;

        const inactiveparticipants = await db.collection("participants").find(
        { lastStatus: 
            { $lt: Date.now() - timeLimit }
        }).toArray();
            
        inactiveparticipants.forEach(async (user) => {

            await db.collection("participants").deleteOne({name: user.name});

            await db.collection("messages").insertOne({
                from: user.name,
                to: 'Todos',
                text: 'sai da sala...',
                type: 'status',
                time: dayjs().format('HH:mm:ss')
            });
        });

    }
    catch (err) {
        console.log(err.message);
    }

}, 15000)

app.listen(process.env.PORT);