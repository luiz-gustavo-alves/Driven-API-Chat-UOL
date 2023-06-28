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

app.post("/participants", (req, res) => {

    const { name } = req.body;

    db.collection("users").insertOne({
        name: name,
        lastStatus: Date.now()
    })
    .then(() => {

        db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        })
        .then(() => res.send(201))
        .catch((err) => res.status(500).send(err.message));
    })
    .catch((err) => res.status(500).send(err.message));
})

app.get("/participants", (req, res) => {

    db.collection("users").find().toArray()
        .then((users) => res.status(200).send(users))
        .catch((err) => res.status(500).send(err));
})

app.post("/messages", (req, res) => {

    const { to, text, type } = req.body;
    const { user } = req.headers;

    db.collection("messages").insertOne({
        from: user,
        to: to,
		text: text,
		type: type,
		time: dayjs().format('HH:mm:ss')
    })
    .then(() => res.send(201))
    .catch((err) => res.status(500).send(err.message));
})

app.get("/messages", (req, res) => {

    const { user } = req.headers;
    let { limit } = req.query;

    limit = Number(limit)

    db.collection("messages").find().limit(limit).toArray()
        .then((users) => {

            const requestMessages = [];
            users.forEach((message) => {

                if (message.to === "Todos" || message.to === user || message.from === user) {
                    requestMessages.push({...message});
                }
            });

            res.status(200).send(requestMessages);
        })
        .catch((err) => res.status(500).send(err.messages));
})

app.listen(process.env.PORT);