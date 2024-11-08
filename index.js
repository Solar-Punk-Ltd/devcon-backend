const express = require("express");
const fs = require("fs");
const { Worker } = require("node:worker_threads");
const path = require("path");
const crypto = require("crypto");
const ethers = require("ethers");

const firebase = require("firebase");

// Required for side-effects
require("firebase/firestore");
var cors = require("cors");

const firebaseConfig = JSON.parse(fs.readFileSync("config.json", "utf8"));

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = firebase.firestore();
const usersDB = process.env.USERS_DB || "users-test";

const app = express();

app.use(cors());
app.use(express.json());

// TODO: remove logger middleware
app.use((req, res, next) => {
  req.time = new Date(Date.now()).toString();
  console.log(req.method, req.hostname, req.path, req.time);
  console.log(req.body);
  next();
});

const PORT = 4000;
const USER_COUNT_FETCH_INTERVAL = 15 * 60 * 1000;


const giftcodes = JSON.parse(fs.readFileSync("giftcodes.json", "utf8")); // random strings for testing

const namelist = JSON.parse(fs.readFileSync("names.json", "utf8"));
const firstnames = namelist.firstnames;
const lastnames = namelist.lastnames;

const roomData = JSON.parse(fs.readFileSync("rooms.json", "utf-8"));

let userCountState = [];

async function saveName(name, publicKey) {
  let docRef = db.collection(usersDB).doc(name);
  await docRef.set({
    id: name,
    points: 0,
    key: publicKey,
    code: "",
    nonce: "",
  });
}

async function saveCode(name, code) {
  let docRef = db.collection(usersDB).doc(name);
  const doc = await docRef.get();
  if (doc.exists) {
  await docRef.update({
    code: code,
  });
}
}

async function isNameUsed(name) {
  let docRef = db.collection(usersDB).doc(name);
  try {
    const doc = await docRef.get();
    return doc.exists;
  } catch (TypeError) {
    return false;
  }
}

async function getPoints(name) {
  let docRef = db.collection(usersDB).doc(name);
  const doc = await docRef.get();
  if (doc.exists) {
    return doc.data().points;
  }
  return 0;
}

async function addPoints(name) {
  let docRef = db.collection(usersDB).doc(name);
  const doc = await docRef.get();
  if (doc.exists) {
    const increasedPoints = doc.data().points + 1;
    await docRef.update({
      points: increasedPoints,
    });
    return increasedPoints;
  }
  return 0;
}

async function genNonce(name) {
  let docRef = db.collection(usersDB).doc(name);
  const doc = await docRef.get();
  if (doc.exists) {
    const nonce = crypto.randomBytes(16).toString("hex");
    await docRef.update({
      nonce: nonce,
    });
    return nonce;
  }
  return "";
}

async function pickRandomUserName() {
  let randomf = Math.floor(Math.random() * firstnames.length);
  let randoml = Math.floor(Math.random() * lastnames.length);
  const name = [firstnames[randomf], lastnames[randoml]].join(" ");
  while (await isNameUsed(name)) {
    let randomf = Math.floor(Math.random() * firstnames.length);
    let randoml = Math.floor(Math.random() * lastnames.length);
    name = [firstnames[randomf], lastnames[randoml]].join(" ");
  }
  return name;
}

app.get("/username", async (req, res) => {
  let n = await pickRandomUserName();
  res.send(n);
});

app.get("/username/:name", async (req, res) => {
  if (await isNameUsed(req.params.name)) {
    res.statusCode = 409;
    res.send("name is already in use");
  } else {
    res.statusCode = 200;
    res.send("name can be used");
  }
});

app.post("/username", async (req, res) => {
  if (await isNameUsed(req.body.username)) {
    res.statusCode = 409;
    res.send("name is already in use");
  } else {
    await saveName(req.body.username, req.body.key);
    res.statusCode = 200;
    res.send("user created");
  }
});

app.post("/redeem", async (req, res) => {
  let docRef = db.collection(usersDB).doc(name);
  const doc = await docRef.get();
  const data = doc.data();
  if (doc.exists && data.code !== "") {
    res.statusCode = 200;
    res.send("already redeemed");
    return;
  } else if (giftcodes.length > 0) {
    if (
      doc.exists &&
      data.points >= 10
    ) {
      const signerAddr = ethers.verifyMessage(req.body.message, req.body.sig);
      const savedAddress = ethers.computeAddress(
        data.key
      );
      console.log(signerAddr, savedAddress);
      if (
        signerAddr !== savedAddress ||
        req.body.message !== data.nonce
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

app.get("/points/:name", async (req, res) => {
  const points = await getPoints(req.params.name);
  res.send(points.toString());
});

app.post("/addpoints/:name", async (req, res) => {
  const token = req.headers["authorization"];
  if (token !== "Bearer " + process.env.API_KEY) {
    res.statusCode = 403;
    res.send("forbidden");
    return;
  }
  const points = await addPoints(req.params.name);
  res.send(points.toString());
});

app.get("/nonce/:name", async (req, res) => {
  if (await isNameUsed(req.params.name)) {
    const nonce = await genNonce(req.params.name);
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
