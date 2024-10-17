const { parentPort, workerData } = require('node:worker_threads');
const { SwarmChat } = require('@solarpunkltd/swarm-decentralized-chat');

if (!parentPort) throw "Parent Port is null";

// Parameters from the main thread
const {
    rooms,
} = workerData;

async function countUsers() {
    const userCountsPromises =  rooms.map(async (room) => {
        try {

            const chat = new SwarmChat({
                url: room.url,
                gateway: room.gateway,
                logLevel: "debug"
            });
            await chat.initUsers(room.topic);
    
            const userCount = chat.getUserCount();
            console.info(`User count for room ${room.topic}: ${userCount}`);
    
            return {
                ...room,
                userCount: userCount
            }
            
        } catch (error) {
            console.error("Error getting user count: ", error);
            return {
                ...room,
                userCount: null
            }
        }
    });

    const userCounts = await Promise.all(userCountsPromises)

    parentPort.postMessage(userCounts);
}

countUsers();
