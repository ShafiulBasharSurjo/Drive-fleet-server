const express = require("express");

const { MongoClient, ServerApiVersion } = require("mongodb");

const uri =
  "mongodb+srv://Tiles_Gallery:<db_password>@cluster0.togxpm6.mongodb.net/?appName=Cluster0";

const app = express();
const port = 5000;

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
