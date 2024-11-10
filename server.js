import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { neon } from "@neondatabase/serverless";

dotenv.config();

const port = 4444;
const app = express();

const sql = neon(process.env.DATABASE_URL);

const corsOptions = {
  origin: "*",
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

app.get("/get-categories", async (req, res) => {
  try {
    const result = await sql("SELECT name FROM category");

    res.status(200).json({ categories: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch categories." });
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

app.post("/create-category", async (req, res) => {
  const { categoryname } = req.body;

  if (!categoryname) {
    return res.status(400).json({ error: "Category name is required." });
  }

  const insertCategoryQuery = `
    INSERT INTO category (name) 
    VALUES ($1)  -- Parameterized query
    RETURNING name; -- Return the created category name for confirmation
  `;

  try {
    const result = await sql(insertCategoryQuery, [categoryname]);

    if (result.length === 0) {
      return res.status(500).json({ error: "Failed to create category." });
    }

    const createdCategory = result[0];
    res.status(201).json({
      message: `Category '${createdCategory.name}' created successfully!`,
      category: createdCategory,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category." });
  }
});

app.listen(port, () => {
  console.log(`Server running 100% at http://localhost:${port}`);
});
