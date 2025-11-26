import express from "express";
import bodyParser from "body-parser";
import {query} from "./db/db.js"
import bcrypt from 'bcrypt';
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as FacebookStrategy } from 'passport-facebook';

const app = express();
const port = 3000;
const saltRounds = 2;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


//creating session
app.use(
  session({
  secret:"TOPSECRETWORD",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60,
    httpOnly: true,
    secure: false,
    sameSite: "lax"
  }
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
            const response = await query("INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *;",[username, hash]);
            const user = response.rows[0];

            req.login(user, (err) => {
              console.log("success");
              res.redirect("/secrets");
            })

        }
        });
      }
  
  } catch (error) {
    console.error("error creating user: ", error);
    res.status(500).send("internal server error");
  }
});

app.get('/auth/facebook', passport.authenticate('facebook', {scope: ['email']}));

app.get('/auth/facebook/callback', passport.authenticate("facebook", {
  successRedirect: "/secrets",
  failureRedirect: "/login"
}));

app.post("/login", passport.authenticate('local', {
    successRedirect: '/secrets',
    failureRedirect: '/login'
}));

passport.use(new LocalStrategy(async function verify(username, password, cb){
  
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

passport.use(new FacebookStrategy({

  clientID: process.env.FB_APP_ID ,
  clientSecret: process.env.FB_APP_SECRET ,
  callbackURL: 'http://localhost:3000/auth/facebook/callback',
  profileFields: ['id','email']

} ,async (accessToken, refreshToken, profile, cb) => {

  try {
    let result = await query("SELECT * FROM users WHERE facebook_id = $1;",[profile.id]);

    //user exists
    if (result.rowCount > 0){
      return cb (null, result.rows[0]);
    }

    const newUser = await query("INSERT INTO users (facebook_id, username) VALUES ($1, $2) RETURNING *", [profile.id, profile.emails[0].value]);

    return cb(null, newUser.rows[0]);
  } catch (error) {
    return cb(error)
  }

} ));

app.get("/secrets", (req, res)=>{
  if(req.isAuthenticated()){
    res.render("secrets.ejs")
  }else{
    res.redirect("/login");
  }
});

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
