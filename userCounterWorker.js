const { parentPort, workerData } = require('node:worker_threads');

if (!parentPort) throw "Parent Port is null";

// Parameters from the main thread
const {
    exampleParam,
} = workerData;

async function countUsers() {
    console.log("Counting users...")
}

countUsers();