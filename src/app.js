import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
import joi from "joi";
import { stripHtml } from "string-strip-html";
import dotenv from "dotenv";

dotenv.config();

/* API configuration */
const app = express();
app.use(express.json());
app.use(cors());

/* Connection to mongoClient database */
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

/* Schemas for data validation */
const participantSchema = joi.object({
    name: joi.string().required()
});

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required()
});

app.post("/participants", async (req, res) => {

    try {

        let { name } = req.body;

        const validation = participantSchema.validate({ name: name });

        if (validation.error) {
            return res.sendStatus(422);
        }

        name = stripHtml(name).result;

        const participantDB = await db.collection("participants").findOne({ name: name });

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
});

app.get("/participants", async (req, res) => {

    try {
        const participantsDB = await db.collection("participants").find().toArray();
        res.send(participantsDB);

    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post("/messages", async (req, res) => {

    try {

        let { to, text, type } = req.body;
        const { user } = req.headers;

        const validation = messageSchema.validate(
            { to: to, text: text, type: type }, 
            { abortEarly: false }
        );

        if (validation.error) {
            return res.sendStatus(422);
        }

        to = stripHtml(to).result;
        text = (stripHtml(text).result).trim();
        type = stripHtml(type).result;

        const participantDB = await db.collection("participants").findOne({ name: user });

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
});

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

        /* Filter messages */
        const requestedMessages = [];
        messagesDB.forEach((message) => {

            if (message.to === "Todos" || message.to === user || message.from === user) {
                requestedMessages.push({...message});
            }
        });

        res.status(200).send(requestedMessages);

    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.post("/status", async (req, res) => {

    try {

        const { user } = req.headers;

        if (!user) {
            return res.sendStatus(422);
        }

        const requestedParticipant = await db.collection("participants").findOneAndUpdate(
        { name: user }, 
        { $set: 
            { lastStatus: Date.now() }
        });

        if (!requestedParticipant.value) {
            return res.sendStatus(404);
        }

        res.sendStatus(200);

    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.delete("/messages/:id", async (req, res) => {

    try {

        const { user } = req.headers;
        const { id } = req.params;

        const requestedMessage = await db.collection("messages").findOne({ _id: new ObjectId(id) });

        if (!requestedMessage) {
            return res.sendStatus(404);
        }

        if (requestedMessage.from !== user) {
            return res.sendStatus(401);
        }

        await db.collection("messages").deleteOne({ _id: new ObjectId(id) });
        res.sendStatus(200);

    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.put("/messages/:id", async (req, res) => {

    try {

        let { to, text, type } = req.body;
        const { user } = req.headers;
        const { id } = req.params;

        const validation = messageSchema.validate(
            { to: to, text: text, type: type }, 
            { abortEarly: false }
        );

        if (validation.error) {
            return res.sendStatus(422);
        }

        to = stripHtml(to).result;
        text = (stripHtml(text).result).trim();
        type = stripHtml(type).result;

        const requestedParticipant = await db.collection("participants").findOne({ name: user });

        if (!requestedParticipant) {
            return res.sendStatus(422);
        }

        const requestedMessage = await db.collection("messages").findOne({ _id: new ObjectId(id) });

        if (!requestedMessage) {
            return res.sendStatus(404);
        }

        if (requestedMessage.from !== user) {
            return res.sendStatus(401);
        }

        await db.collection("messages").findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set:
            { text: text }
        });

        res.sendStatus(200);

    } catch (err) {
        res.status(500).send(err.message);
    }
});

setInterval(async () => {

    try {

        const timeLimit = 10000;
        const inactiveParticipants = await db.collection("participants").find(
        { lastStatus: 
            { $lt: Date.now() - timeLimit }
        }).toArray();

        inactiveParticipants.forEach(async (user) => {

            await db.collection("participants").deleteOne({ name: user.name });

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

}, 15000);

app.listen(process.env.PORT);