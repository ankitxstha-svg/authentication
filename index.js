import express from "express";
import bodyParser from "body-parser";
import {query} from "./db/db.js"
import bcrypt from 'bcrypt';
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

const app = express();
const port = 3000;
const saltRounds = 2;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


//creating session
app.use(session({
  secret:"TOPSECRET",
  resave: false,
  saveUninitialized: true
}))

app.use(passport.initialize());
//read and write to session
app.use(passport.session());

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
    const response = await query("SELECT * FROM users where username = ($1);", [username]);

    if(response.rowCount > 0){
      res.send("email already exist");
    }else{

        bcrypt.hash(password, saltRounds, async (err, hash) => {
          if(err){
            console.error("error registering: ", err);
          }else{
            const response = await query("INSERT INTO users (username, password) VALUES ($1, $2);",[username, hash]);

            if(response.rowCount > 0){
              res.status(200).render("secrets.ejs");
            }else{
              res.status(500).send("internal server error");
          }}
        });
      }
  
  } catch (error) {
    console.error("error creating user: ", error);
    res.status(500).send("internal server error");
  }
});

app.post("/login", async (req, res) => {

});

passport.use(new Strategy(async function verify(username, password, cb){
  
  try {
    const response = await query("select * from users where username = ($1);", [username]);

    if(response.rowCount > 0){
      const checkPassword = response.rows[0].password;
      const user = response.rows[0];

      bcrypt.compare(password, checkPassword, (err, result) => {
        if(err){
          return cb(err);
        }else{
          if(result){
            return cb(null, user);
          }else{
            return cb(null, false);
          }
        }
      })
    }else{
      return cb("user not found");
    }

  } catch (error) {
    return cb(error); 
  }
}));

app.get("/secrets", (req, res)=>{
  if(req.isAuthenticated()){
    res.render("secrets.ejs")
  }else{
    res.redirect("/login");
  }
});



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
