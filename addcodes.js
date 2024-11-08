const fs = require("fs");
const path = require("path");

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

const giftcodes = JSON.parse(fs.readFileSync("giftcodes.json", "utf8")); // random strings for testing

giftcodes.forEach(async (code) => {
    await saveCode(code, "unused");
});

function saveCode(code, status) {
    let docRef = db.collection("codes-test").doc();
    docRef.set({
        code: code,
        user: "",
    });
}