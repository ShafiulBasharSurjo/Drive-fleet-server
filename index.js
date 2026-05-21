const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
dotenv.config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("drivefleet");

    const carsCollection = db.collection("cars");

    app.get("/cars", async (req, res) => {
      try {
        const cursor = carsCollection.find();
        const result = await cursor.toArray();
        res.json(result);
      } catch (error) {
        console.error("Error fetching cars:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/cars", async (req, res) => {
      const car = req.body;
      console.log(car);
      const result = await carsCollection.insertOne(car);
      res.json(result);
    });

    app.get("/cars/:id", async (req, res) => {
      const { id } = req.params;

      const result = await carsCollection.findOne({ _id: new ObjectId(id) });

      res.json(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Drivefleet server is running fine!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
