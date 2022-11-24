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
        const usersCollection = client.db("remart").collection("users");
        const categoryCollection = client.db('remart').collection("category");

        app.put("/users", async (req, res) => {
            const user = req.body;
            const email = user.email;
            const filter = { email: email }
            const updateDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(filter, updateDoc, { upsert: true })
            // generate token
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "7d" })

            res.send({ result, token });
        })
        app.get("/jwt/:email", async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const query = { email: email }
            const result = await usersCollection.findOne(query);
            if (result) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "7d" })
                res.send({ token });
            }

        });

        // products api ---------------------------------
        //----------------------------------------------------
        // load category
        app.get("/category", async (req, res) => {
            const query = {};
            const result = await categoryCollection.find(query).toArray();
            res.send(result);
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