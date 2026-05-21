require("dotenv").config();
const { MongoClient } = require("mongodb");

const samples = [
  {
    carName: "Toyota Premio",
    dailyRentPrice: 4500,
    carType: "Sedan",
    imageUrl:
      "https://images.unsplash.com/photo-1621007947382-bcb904ee758f?w=800",
    seatCapacity: 5,
    pickupLocation: "Dhaka, Gulshan",
    description:
      "Comfortable sedan with AC, perfect for city trips and airport runs.",
    availability: "available",
    ownerEmail: "demo@drivefleet.com",
    ownerName: "DriveFleet Demo",
    booking_count: 12,
    createdAt: new Date(),
  },
  {
    carName: "Mitsubishi Pajero Sport",
    dailyRentPrice: 8500,
    carType: "SUV",
    imageUrl:
      "https://images.unsplash.com/photo-1519641471654-76ce5427e686?w=800",
    seatCapacity: 7,
    pickupLocation: "Chittagong",
    description: "Spacious SUV for family tours and hill tracks.",
    availability: "available",
    ownerEmail: "demo@drivefleet.com",
    ownerName: "DriveFleet Demo",
    booking_count: 8,
    createdAt: new Date(),
  },
  {
    carName: "Honda City",
    dailyRentPrice: 4000,
    carType: "Sedan",
    imageUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800",
    seatCapacity: 5,
    pickupLocation: "Dhaka, Dhanmondi",
    description: "Fuel-efficient sedan with smooth handling.",
    availability: "available",
    ownerEmail: "demo@drivefleet.com",
    ownerName: "DriveFleet Demo",
    booking_count: 5,
    createdAt: new Date(),
  },
  {
    carName: "Toyota Noah",
    dailyRentPrice: 7000,
    carType: "Microbus",
    imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
    seatCapacity: 8,
    pickupLocation: "Sylhet",
    description: "Ideal MPV for group travel and wedding events.",
    availability: "available",
    ownerEmail: "demo@drivefleet.com",
    ownerName: "DriveFleet Demo",
    booking_count: 3,
    createdAt: new Date(),
  },
  {
    carName: "Mercedes E-Class",
    dailyRentPrice: 18000,
    carType: "Luxury",
    imageUrl:
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800",
    seatCapacity: 5,
    pickupLocation: "Dhaka, Banani",
    description: "Executive luxury sedan for business and VIP travel.",
    availability: "available",
    ownerEmail: "demo@drivefleet.com",
    ownerName: "DriveFleet Demo",
    booking_count: 15,
    createdAt: new Date(),
  },
  {
    carName: "Nissan Leaf",
    dailyRentPrice: 5500,
    carType: "Electric",
    imageUrl:
      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800",
    seatCapacity: 5,
    pickupLocation: "Dhaka, Uttara",
    description: "Quiet electric hatchback for eco-friendly city driving.",
    availability: "available",
    ownerEmail: "demo@drivefleet.com",
    ownerName: "DriveFleet Demo",
    booking_count: 2,
    createdAt: new Date(),
  },
  {
    carName: "Suzuki Swift",
    dailyRentPrice: 3200,
    carType: "Hatchback",
    imageUrl:
      "https://images.unsplash.com/photo-1494976688679-d504f380cba4?w=800",
    seatCapacity: 4,
    pickupLocation: "Rajshahi",
    description: "Compact hatchback, easy parking and low daily cost.",
    availability: "unavailable",
    ownerEmail: "demo@drivefleet.com",
    ownerName: "DriveFleet Demo",
    booking_count: 0,
    createdAt: new Date(),
  },
];

async function seed() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db("drivefleet");
  const cars = db.collection("cars");
  const count = await cars.countDocuments();
  if (count >= 6) {
    console.log(`Already ${count} cars — skip seed.`);
    await client.close();
    return;
  }
  await cars.insertMany(samples);
  console.log(`Seeded ${samples.length} sample cars.`);
  await client.close();
}

seed().catch(console.error);
