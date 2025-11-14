import express from "express";
import bodyParser from "body-parser";
import {query} from "./db/db.js"

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  try {
    const response = await query("INSERT INTO users (username, password) VALUES ($1, $2);",[username, password]);
  
    if(response.rowCount > 0){
      res.status(200).render("secrets.ejs");
    }else{
      res.status(500).send("internal server error");
    }
  } catch (error) {
    console.error("error creating user: ", error);
    res.status(500).send("internal server error");
  }
});

app.post("/login", async (req, res) => {

  try {
    const username = req.body.username;
    const password = req.body.password;

    const response = await query("select * from users where username = ($1);", [username]);

    if(response.rowCount > 0){
      const checkPassword = response.rows[0].password;

      if(checkPassword === password){
        res.status(200).send("matched password");
      }else{
        res.status(401).send("invalid credentials");
      }
    }else{
      res.status(404).send("no user found");
    }

  } catch (error) {
    
  }


});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
