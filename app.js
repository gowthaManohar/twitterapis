const express = require("express");
const app = express();
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
app.use(express.json());
const dbpath = path.join(__dirname, "twitterClone.db");
let db = null;

const initializationDbAndServer = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`db error ${e.message}`);
    process.exit(1);
  }
};
initializationDbAndServer();

const Authentification = (request, response, next) => {
  let jwttoken = null;
  const authheader = request.headers["authorization"];
  if (authheader !== undefined) {
    jwttoken = authheader.split(" ")[1];
  }
  if (jwttoken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwttoken, "manohar", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//API 1 REGISTER
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const checkquery = `SELECT * FROM user WHERE username = '${username}';`;
  const usercheck = await db.get(checkquery);
  const hashpassword = await bcrypt.hash(password, 10);

  if (usercheck === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const addquery = `INSERT INTO user(name,username,password,gender)
      VALUES('${name}','${username}','${hashpassword}','${gender}');`;
      const dbresponse = await db.run(addquery);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//API2 LOGIN

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const usercheck = `SELECT * FROM user WHERE username='${username}';`;
  const userdata = await db.get(usercheck);
  if (userdata === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const passwordcheck = await bcrypt.compare(password, userdata.password);
    if (passwordcheck) {
      let payload = { username: username };
      let jwtToken = jwt.sign(payload, "manohar");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//api 3 GET TWEETS

app.get("/user/tweets/feed/", Authentification, async (request, response) => {
  const { username } = request;
  console.log(username);
  const gquery = `SELECT * FROM user WHERE username = '${username}';`;
  const userresponse = await db.get(gquery);
  const gettweets = `SELECT user.username,tweet.tweet,tweet.date_time as dateTime FROM (follower join tweet on
  tweet.user_id = follower.following_user_id) as t join user on 
  user.user_id = t.following_user_id 
  WHERE 
    t.follower_user_id = '${userresponse.user_id}'

  ORDER BY 
  tweet.date_time DESC
  LIMIT 
   ${4}
  ;`;
  const dbresponse = await db.all(gettweets);
  response.send(dbresponse);
});

//API 4 GET FOLLOWING

app.get("/user/following/", Authentification, async (request, response) => {
  const { username } = request;
  console.log(username);
  const gquery = `SELECT * FROM user WHERE username = '${username}';`;
  const userresponse = await db.get(gquery);
  const gettweets = `SELECT DISTINCT user.name FROM (follower join tweet on
  tweet.user_id = follower.following_user_id) as t join user on 
  user.user_id = t.following_user_id 
  WHERE 
    t.follower_user_id = '${userresponse.user_id}'

  
  ;`;
  const dbresponse = await db.all(gettweets);
  response.send(dbresponse);
});

//API 5 GET FOLLOWERS
app.get("/user/followers/", Authentification, async (request, response) => {
  const { username } = request;
  console.log(username);
  const gquery = `SELECT * FROM user WHERE username = '${username}';`;
  const userresponse = await db.get(gquery);
  const gettweets = `SELECT user.name FROM (follower JOIN user on
     follower.follower_user_id = user.user_id) 
WHERE 
following_user_id = '${userresponse.user_id}'
  ;`;
  const dbresponse = await db.all(gettweets);
  response.send(dbresponse);
});

// get tweets api6

app.get("/tweets/:tweetId/", Authentification, async (request, response) => {
  const { tweetId } = request.params;
  const { username } = request;
  console.log(username);
  const gquery = `SELECT * FROM user WHERE username = '${username}';`;
  const userresponse = await db.get(gquery);
  const gettweets = `SELECT * FROM follower JOIN user on
     follower.follower_user_id = user.user_id JOIN tweet on 
     follower.follower_user_id = tweet.user_id JOIN like on tweet.tweet_id = like.tweet_id
WHERE 
follower.following_user_id = '${userresponse.user_id}' and tweet.tweet_id = ${tweetId}
  ;`;
  const dbresponse = await db.all(gettweets);
  console.log(dbresponse);
  if (dbresponse === []) {
    return response.send("invalid");
  } else {
    response.send(dbresponse);
  }
});

module.exports = app;
