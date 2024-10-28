const express = require("express");
const fs = require("fs");
const { Worker } = require("node:worker_threads");
const path = require("path");
const crypto = require("crypto");
const ethers = require("ethers");

var cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// TODO: remove logger middleware
app.use((req, res, next) => {
  req.time = new Date(Date.now()).toString();
  console.log(req.method, req.hostname, req.path, req.time);
  console.log(req.body);
  console.log(users);
  next();
});

const PORT = 4000;
const USER_COUNT_FETCH_INTERVAL = 15 * 60 * 1000;

//TODO: persist this
//TODO: check lower case names?
const users = new Map();

//TODO: these are random codes, we need to add the real ones
//make it a sealed secret?
const giftcodes = JSON.parse(fs.readFileSync("giftcodes.json", "utf8")); // random strings for testing

const namelist = JSON.parse(fs.readFileSync("names.json", "utf8"));
const firstnames = namelist.firstnames;
const lastnames = namelist.lastnames;

const roomData = JSON.parse(fs.readFileSync("rooms.json", "utf-8"));

let userCountState = [];

function saveName(name, publicKey) {
  users.set(name, { key: publicKey, points: 0 });
}

function saveCode(name, code) {
  users.set(name, {
    ...users.get(name),
    code: code,
  });
}

function isNameUsed(name) {
  return users.has(name);
}

function pickRandomUserName() {
  let randomf = Math.floor(Math.random() * firstnames.length);
  let randoml = Math.floor(Math.random() * lastnames.length);
  const name = [firstnames[randomf], lastnames[randoml]].join(" ");
  while (isNameUsed(name)) {
    let randomf = Math.floor(Math.random() * firstnames.length);
    let randoml = Math.floor(Math.random() * lastnames.length);
    name = [firstnames[randomf], lastnames[randoml]].join(" ");
  }
  return name;
}

app.get("/username", (req, res) => {
  let n = pickRandomUserName();
  while (isNameUsed(n)) {
    n = pickRandomUserName();
  }
  res.send(n);
});

app.get("/username/:name", (req, res) => {
  if (isNameUsed(req.params.name)) {
    res.statusCode = 409;
    res.send("name is already in use");
  } else {
    res.statusCode = 200;
    res.send("name can be used");
  }
});

app.post("/username", (req, res) => {
  if (isNameUsed(req.body.username)) {
    res.statusCode = 409;
    res.send("name is already in use");
  } else {
    saveName(req.body.username, req.body.key);
    res.statusCode = 200;
    res.send("user created");
  }
});

app.post("/redeem", (req, res) => {
  if (giftcodes.length > 0) {
    if (users.has(req.body.username) && users.get(req.body.username).points >= 10) {
      const savedCode = users.get(req.body.username).code;
      if (savedCode !== undefined) {
        res.statusCode = 200;
        res.send(savedCode);
        return;
      }
      const signerAddr = ethers.verifyMessage(
        req.body.message,
        req.body.sig
      );
      if (
        signerAddr !== users.get(req.body.username).key ||
        req.body.message !== users.get(req.body.username).nonce
      ) {
        res.statusCode = 403;
        res.send("wrong signature");
        return;
      }
      const code = giftcodes.pop();
      saveCode(req.body.username, code);
      res.statusCode = 200;
      res.send(code);
    } else {
      res.statusCode = 403;
      res.send("not enough points");
    }
  } else {
    res.statusCode = 404;
    res.send("no more codes");
  }
});

app.get("/points/:name", (req, res) => {
  if (users.has(req.params.name))
    res.send(users.get(req.params.name).points.toString());
  else res.send("0");
});

//TODO: remove after testing
app.get("/addpoints/:name", (req, res) => {
  if (users.has(req.params.name)) {
    users.set(req.params.name, {
      ...users.get(req.params.name),
      points: users.get(req.params.name).points + 1,
    });
    res.send(users.get(req.params.name).points.toString());
  }
});

app.get("/nonce/:name", (req, res) => {
  if (users.has(req.params.name)) {
    const nonce = crypto.randomBytes(16).toString("hex");
    users.set(req.params.name, {
      ...users.get(req.params.name),
      nonce: nonce,
    });
    res.send(nonce);
  } else res.send("0");
});

app.get("/user-count", (req, res) => {
  res.send(userCountState);
});

function fetchUserCounts() {
  console.info("Fetching user counts for the rooms...");
  const userCountWorker = new Worker(
    path.resolve(__dirname, "./userCounterWorker.js"),
    {
      workerData: {
        rooms: roomData.rooms,
      },
    }
  );

  userCountWorker.on("message", (message) => {
    userCountState = message;
    console.info("User counts updated.");
  });
}

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);

  setInterval(() => fetchUserCounts(), USER_COUNT_FETCH_INTERVAL);
});
