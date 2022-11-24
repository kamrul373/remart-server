const express = require("express");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require("jsonwebtoken");

const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors())
app.use(express.json());

// mongdb connection 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lbqhd62.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

console.log(uri)

async function run() {
    try {
        const buyerCollection = client.db("remart").collection("buyers");

        app.put("/buyers", async (req, res) => {
            const buyer = req.body;
            const email = buyer.email;
            const filter = { email: email }
            const updateDoc = {
                $set: buyer
            }
            console.log(buyer)

            const result = await buyerCollection.updateOne(filter, updateDoc, { upsert: true })

            // generate token
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "7d" })

            res.send({ result, token });
        })

    } finally {

    }
}

run().catch(error => console.log(error))

app.get("/", (req, res) => {
    res.send("Remart server is running");
});

app.listen(port, () => {
    console.log("Remart server is running at ", port);
})