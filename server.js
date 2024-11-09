import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { neon } from "@neondatabase/serverless";

dotenv.config();

const port = 4444;
const app = express();

const sql = neon(process.env.DATABASE_URL);

const corsOptions = {
  origin: "http://localhost:3000",
  methods: "GET,POST",
  allowedHeaders: "Content-Type, Authorization",
};

app.use(cors(corsOptions));

app.use(express.json());

app.get("/", async (request, response) => {
  try {
    const user = await sql`SELECT * FROM user_data`;
    response.send(user);
  } catch (error) {
    console.error("Error querying database:", error);
    response.status(500).send("Error querying database");
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await sql`SELECT * FROM user_data WHERE email = ${email}`;
    if (user.length === 0) {
      return res.status(400).json({ message: "email or password not match" });
    }

    if (user[0].password !== password) {
      return res.status(400).json({ message: "password not match" });
    }

    res.status(200).json({ message: "Login successful", user: user[0] });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error during login user" });
  }
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser =
      await sql`SELECT * FROM user_data WHERE email = ${email}`;

    if (existingUser.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = await sql`
        INSERT INTO user_data (email, password) 
        VALUES (${email}, ${password})
        RETURNING id, email
      `;

    res
      .status(201)
      .json({ message: "User created successfully", user: newUser[0] });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error during create user" });
  }
});

app.post("/create-category", async (req, response) => {
  const { tableName } = req.body;
  try {
    const newtable = await sql`CREATE TABLE IF NOT EXISTS ${tableName} 
      (id SERIAL PRIMARY KEY, incomes TEXT NOT NULL, expenses TEXT NOT NULL);
      INSERT INTO ${tableName} (incomes, expenses)
      VALUES ('0', '0')`;
    response.send(newtable);
  } catch (error) {
    console.error("Error querying database:", error);
    response.status(500).send("Error querying database");
  }
});

app.listen(port, () => {
  console.log(`Server running 100% at http://localhost:${port}`);
});
