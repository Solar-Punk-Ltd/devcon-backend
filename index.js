const express = require("express");
const fs = require('fs');

var cors = require("cors");
var bodyParser = require('body-parser');

const app = express();

const port = 4000;

const names = [];

app.use(cors());
app.use(bodyParser.text());

const obj = JSON.parse(fs.readFileSync('names.json', 'utf8'));
const firstnames = obj.firstnames;
const lastnames = obj.lastnames;


function saveName(name) {
  names.push(name);
}

function isNameUsed(name) {
  return names.includes(name);
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
  console.log(names);
});

app.post("/username", (req, res) => {
  if (isNameUsed(req.body)) {
    res.statusCode = 409;
    res.send("name is already in use");
  } else {
    saveName(req.body); 
    res.statusCode = 200;
    res.send("user created");
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
