import express, {json} from "express";
import cors from "cors";
import dotenv from 'dotenv'

dotenv.config()

const app = express();
app.use(json());
app.use(cors());

app.get("/", (req, res) => {
    res.send("Hello World!");
})

app.listen(process.env.PORT);