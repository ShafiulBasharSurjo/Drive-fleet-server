const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const { MongoClient, ObjectId } = require("mongodb");
const { OAuth2Client } = require("google-auth-library");
const {
  verifyToken,
  createToken,
  setAuthCookie,
  clearAuthCookie,
} = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(
  cors({
    origin: [CLIENT_URL, "http://localhost:3000"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
});
let db = null;
let dbReady = false;

function requireDb(req, res, next) {
  if (!dbReady) {
    return res.status(503).json({
      message:
        "Database is not connected. Start the API server and check MONGODB_URI in driveFleet-server/.env",
    });
  }
  next();
}

function validatePassword(password) {
  if (!password || password.length < 6) {
    return "Password must be at least 6 characters";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain an uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain a lowercase letter";
  }
  return null;
}

function parseCarBody(body) {
  return {
    carName: body.carName?.trim(),
    dailyRentPrice: Number(body.dailyRentPrice ?? body.pricePerDay),
    carType: body.carType || body.category,
    imageUrl: body.imageUrl?.trim(),
    seatCapacity: Number(body.seatCapacity ?? body.seats),
    pickupLocation: body.pickupLocation || body.location,
    description: body.description?.trim(),
    availability:
      body.availability === "unavailable" || body.availability === false
        ? "unavailable"
        : "available",
  };
}

function daysBetween(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  const diff = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

function getCollections() {
  return {
    users: db.collection("users"),
    cars: db.collection("cars"),
    bookings: db.collection("bookings"),
  };
}

app.get("/", (req, res) => {
  res.json({
    message: "DriveFleet API is running",
    database: dbReady ? "connected" : "connecting",
  });
});

app.post("/auth/register", requireDb, async (req, res) => {
  const { users } = getCollections();
  try {
    const { name, email, photoURL, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }
    const pwdError = validatePassword(password);
    if (pwdError) {
      return res.status(400).json({ message: pwdError });
    }
    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }
    const hashed = await bcrypt.hash(password, 10);
    await users.insertOne({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      photoURL: photoURL || "",
      password: hashed,
      role: "user",
      createdAt: new Date(),
    });
    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/auth/login", requireDb, async (req, res) => {
  const { users } = getCollections();
  try {
    const { email, password } = req.body;
    const user = await users.findOne({ email: email?.toLowerCase()?.trim() });
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = createToken({
      email: user.email,
      name: user.name,
      photoURL: user.photoURL,
    });
    setAuthCookie(res, token);
    res.json({
      message: "Login successful",
      user: { email: user.email, name: user.name, photoURL: user.photoURL },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

app.post("/auth/google", requireDb, async (req, res) => {
  const { users } = getCollections();
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res.status(500).json({
        message:
          "Google OAuth is not configured. Set GOOGLE_CLIENT_ID in driveFleet-server/.env",
      });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Google credential required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    const email = payload.email.toLowerCase();
    let user = await users.findOne({ email });
    if (!user) {
      const doc = {
        name: payload.name,
        email,
        photoURL: payload.picture || "",
        password: null,
        role: "user",
        createdAt: new Date(),
      };
      await users.insertOne(doc);
      user = doc;
    }
    const token = createToken({
      email: user.email,
      name: user.name,
      photoURL: user.photoURL,
    });
    setAuthCookie(res, token);
    res.json({
      message: "Google login successful",
      user: { email: user.email, name: user.name, photoURL: user.photoURL },
    });
  } catch (err) {
    console.error("Google auth error:", err.message);
    res.status(401).json({
      message: err.message?.includes("audience")
        ? "Google Client ID mismatch between client and server .env files"
        : "Google authentication failed",
    });
  }
});

app.post("/auth/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
});

app.get("/auth/me", verifyToken, requireDb, async (req, res) => {
  const { users } = getCollections();
  const user = await users.findOne(
    { email: req.user.email },
    { projection: { password: 0 } },
  );
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }
  res.json({
    email: user.email,
    name: user.name,
    photoURL: user.photoURL,
  });
});

app.get("/cars", requireDb, async (req, res) => {
  const { cars } = getCollections();
  try {
    const { search, type } = req.query;
    const filter = {};
    if (search) {
      filter.carName = { $regex: search, $options: "i" };
    }
    if (type) {
      filter.carType = { $in: type.split(",").map((t) => t.trim()) };
    }
    const result = await cars.find(filter).sort({ createdAt: -1 }).toArray();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch cars" });
  }
});

app.get("/cars/featured", requireDb, async (req, res) => {
  const { cars } = getCollections();
  try {
    const result = await cars
      .find({ availability: "available" })
      .sort({ booking_count: -1 })
      .limit(6)
      .toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch featured cars" });
  }
});

app.get("/cars/my", verifyToken, requireDb, async (req, res) => {
  const { cars } = getCollections();
  try {
    const result = await cars
      .find({ ownerEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch your cars" });
  }
});

app.get("/cars/:id", requireDb, async (req, res) => {
  const { cars } = getCollections();
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid car id" });
    }
    const car = await cars.findOne({ _id: new ObjectId(req.params.id) });
    if (!car) return res.status(404).json({ message: "Car not found" });
    res.json(car);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch car" });
  }
});

app.post("/cars", verifyToken, requireDb, async (req, res) => {
  const { cars } = getCollections();
  try {
    const data = parseCarBody(req.body);
    if (
      !data.carName ||
      !data.dailyRentPrice ||
      !data.carType ||
      !data.imageUrl ||
      !data.seatCapacity ||
      !data.pickupLocation ||
      !data.description
    ) {
      return res.status(400).json({ message: "All car fields are required" });
    }
    const doc = {
      ...data,
      ownerEmail: req.user.email,
      ownerName: req.user.name,
      booking_count: 0,
      createdAt: new Date(),
    };
    const result = await cars.insertOne(doc);
    res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add car" });
  }
});

app.patch("/cars/:id", verifyToken, requireDb, async (req, res) => {
  const { cars } = getCollections();
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid car id" });
    }
    const car = await cars.findOne({ _id: new ObjectId(req.params.id) });
    if (!car) return res.status(404).json({ message: "Car not found" });
    if (car.ownerEmail !== req.user.email) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this car" });
    }
    const updates = {};
    const allowed = [
      "dailyRentPrice",
      "pricePerDay",
      "description",
      "availability",
      "imageUrl",
      "carType",
      "category",
      "pickupLocation",
      "location",
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === "dailyRentPrice" || key === "pricePerDay") {
          updates.dailyRentPrice = Number(req.body[key]);
        } else if (key === "carType" || key === "category") {
          updates.carType = req.body[key];
        } else if (key === "pickupLocation" || key === "location") {
          updates.pickupLocation = req.body[key];
        } else if (key === "availability") {
          updates.availability =
            req.body[key] === "unavailable" || req.body[key] === false
              ? "unavailable"
              : "available";
        } else {
          updates[key] = req.body[key];
        }
      }
    }
    await cars.updateOne({ _id: car._id }, { $set: updates });
    const updated = await cars.findOne({ _id: car._id });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

app.delete("/cars/:id", verifyToken, requireDb, async (req, res) => {
  const { cars } = getCollections();
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid car id" });
    }
    const car = await cars.findOne({ _id: new ObjectId(req.params.id) });
    if (!car) return res.status(404).json({ message: "Car not found" });
    if (car.ownerEmail !== req.user.email) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this car" });
    }
    await cars.deleteOne({ _id: car._id });
    res.json({ message: "Car deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

app.post("/bookings", verifyToken, requireDb, async (req, res) => {
  const { cars, bookings } = getCollections();
  try {
    const { carId, driverNeeded, specialNote, pickupDate, returnDate } =
      req.body;
    if (!carId || !driverNeeded) {
      return res
        .status(400)
        .json({ message: "Car and driver preference required" });
    }
    const car = await cars.findOne({ _id: new ObjectId(carId) });
    if (!car) return res.status(404).json({ message: "Car not found" });
    const days =
      pickupDate && returnDate ? daysBetween(pickupDate, returnDate) : 1;
    const totalPrice = (car.dailyRentPrice || 0) * days;
    const booking = {
      carId: car._id.toString(),
      carName: car.carName,
      carImage: car.imageUrl,
      userEmail: req.user.email,
      userName: req.user.name,
      driverNeeded,
      specialNote: specialNote || "",
      pickupDate: pickupDate || null,
      returnDate: returnDate || null,
      totalPrice,
      bookingDate: new Date(),
      status: "confirmed",
    };
    await bookings.insertOne(booking);
    await cars.updateOne({ _id: car._id }, { $inc: { booking_count: 1 } });
    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Booking failed" });
  }
});

app.get("/bookings/my", verifyToken, requireDb, async (req, res) => {
  const { bookings } = getCollections();
  try {
    const result = await bookings
      .find({ userEmail: req.user.email })
      .sort({ bookingDate: -1 })
      .toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`DriveFleet API listening on http://localhost:${PORT}`);
});

async function connectDatabase() {
  if (!uri) {
    console.error("MONGODB_URI is missing in driveFleet-server/.env");
    return;
  }
  try {
    // await client.connect();
    db = client.db("drivefleet");
    dbReady = true;
    console.log("MongoDB connected (database: drivefleet)");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    console.error(
      "API is running but database routes will keep returning 503 until MongoDB connects.",
    );
  }
}

connectDatabase();
