const express = require("express");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require("jsonwebtoken");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const { query } = require("express");

app.use(cors())
app.use(express.json());

// mongdb connection 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lbqhd62.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeaders = req.headers.authorization;
    if (!authHeaders) {
        return res.status(401).send({ message: "Uaauthorized Access" })
    }
    const token = authHeaders.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
        if (error) {
            return res.status(403).send({ message: "Forbidden Access" })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        const usersCollection = client.db("remart").collection("users");
        const categoryCollection = client.db('remart').collection("category");
        const productsCollection = client.db("remart").collection("products");
        const bookingCollection = client.db("remart").collection("bookings");
        const paymentsCollection = client.db("remart").collection("payments");
        const reportsCollection = client.db("remart").collection("reports");


        // users -------------------------
        // users checking and jwt generation
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
        // getting users based on user role
        app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
            const role = req.query.role;
            if (role) {
                const query = { role: role }
                const result = await usersCollection.find(query).toArray();
                res.send(result);
            }
        })

        app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const userid = req.params.id;
            console.log(userid);
            const query = { _id: ObjectId(userid) }
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });
        // verifying seller by admin
        app.put("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const userid = req.params.id;
            const filter = { _id: ObjectId(userid) }
            const updateDoc = {
                $set: {
                    verified: true
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc);

            console.log(result);

            res.send(result);
        })
        // jwt generation during login
        app.get("/jwt/:email", async (req, res) => {
            const email = req.params.email;
            //console.log(email);
            const query = { email: email }
            const result = await usersCollection.findOne(query);
            if (result) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "7d" })
                res.send({ token });
            }

        });
        // role checking ------------------
        // isAdmin
        app.get("/users/admin/:email", async (req, res) => {
            const email = req.params.email
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const isAdmin = { isAdmin: user?.role === "admin" }

            //console.log(isAdmin);
            res.send(isAdmin);
        })
        app.get("/users/seller/:email", async (req, res) => {
            const email = req.params.email
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const isSeller = { isSeller: user?.role === "seller" }

            //console.log(isSeller);
            res.send(isSeller);
        })

        // user role verification 
        async function verifySeller(req, res, next) {
            const email = req.decoded.email;
            const query = {
                email: email
            }
            const user = await usersCollection.findOne(query);
            if (user.role === "seller") {
                next();
            } else {
                res.status(403).send({ message: "You are not seller" })
            }
        }
        // getting seller verification status 
        app.get("/verificationstatus/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await usersCollection.findOne(query);
            const status = result.verified;
            res.send({ status })
        })
        // verify admin
        async function verifyAdmin(req, res, next) {
            const email = req.decoded.email;
            const query = {
                email: email
            }
            const user = await usersCollection.findOne(query);
            if (user.role === "admin") {
                next();
            } else {
                res.status(403).send({ message: "You are not admin" })
            }
        }
        // products api ---------------------------------
        //----------------------------------------------------
        // load category
        app.get("/category", async (req, res) => {
            const query = {};
            const result = await categoryCollection.find(query).toArray();
            //console.log(result)
            res.send(result);
        });
        app.post("/product", verifyJWT, verifySeller, async (req, res) => {
            const query = req.body;
            //console.log(query);
            const result = await productsCollection.insertOne(query);
            res.send(result);
        })
        // getting my products
        app.get("/myproducts/:email", verifyJWT, verifySeller, async (req, res) => {
            const email = req.params.email;
            const query = { sellerEmail: email }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })
        app.get("/products", async (req, res) => {
            const query = {}
            const result = await productsCollection.find(query).toArray();
            res.send(result)
        })
        // deleting product
        app.delete("/products/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            //console.log(id);
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })
        // category base product 
        app.get("/products/:cattegoryId", async (req, res) => {
            const id = req.params.cattegoryId;
            //console.log(id);
            const query = { categoryId: id, status: "unsold" }
            const result = await productsCollection.find(query).toArray();
            res.send(result)
        });
        // getting ads product
        app.get("/advertisedproducts", async (req, res) => {
            const query = { advertise: true, status: "unsold" }
            const result = await productsCollection.find(query).toArray();
            res.send(result)
        })
        // booking / orders --------------------------------
        app.post("/booking", async (req, res) => {
            const query = req.body;
            const result = await bookingCollection.insertOne(query);
            res.send(result);
        })
        // getting orders / booking
        app.get("/orders", verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { customerEmail: email }
            const result = await bookingCollection.find(query).toArray();
            //console.log(result)
            res.send(result)
        });
        // getting data of single order / booking
        app.get("/orders/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingCollection.findOne(query);
            res.send(result);
        })
        // advertise ------------------------------
        app.get("/advertise/:id", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: { advertise: true }
            }
            const result = await productsCollection.updateOne(filter, updateDoc, { upsert: true })
            res.send(result);
        })

        // stripe payment -------------------------
        //--------------------------
        app.post("/create-payment-intent", async (req, res) => {
            const order = req.body;
            const price = order.productPrice;
            //console.log(price);
            const amount = price * 100;
            //console.log(amount);

            const paymentIntent = await stripe.paymentIntents.create({
                currency: "BDT",
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        app.post("/payments", verifyJWT, async (req, res) => {
            const paymentData = req.body;
            //console.log(paymentData);
            const result = await paymentsCollection.insertOne(paymentData);
            // updating booking payment status
            const bookingId = paymentData.bookingId;
            const filter = { _id: ObjectId(bookingId) };
            const updateDoc = {
                $set: { status: true }
            }
            const bookingstatusUpdate = await bookingCollection.updateOne(filter, updateDoc);
            // updating product 
            const productId = paymentData.productId;
            const query = { _id: ObjectId(productId) };
            const doc = {
                $set: { status: "sold" }
            }
            const productUpdate = await productsCollection.updateOne(query, doc);

            res.send(result)

        })

        // report to admin ---------------------------
        app.post("/report", verifyJWT, async (req, res) => {
            // Who report 
            const data = req.body;
            const reportedProductData = {
                productId: data.productId,
                productName: data.productName,
                reporterEmail: data.email,
                reporterName: data.name,
                report: data.message,
            }
            //console.log(reportedProductData);
            const result = await reportsCollection.insertOne(reportedProductData)
            res.send(result);
        });
        app.get("/report", verifyJWT, verifyAdmin, async (req, res) => {
            const query = {}
            const result = await reportsCollection.find(query).toArray();
            res.send(result);
        })
        app.delete("/report/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await reportsCollection.deleteOne(query);
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