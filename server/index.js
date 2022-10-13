"use strict";

const WebSocket = require('ws');
const http = require('http');
const express = require('express');

require('dotenv').config({ path: __dirname + '\\.env' });

const port = 8080;
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server: server });


const { stringify, parse: jsonify } = JSON;
const deserializeError = stringify({
    msg: "error",
    err: "input is not valid json, json only"
})

const device = {
    smartHome: {
        ws: undefined,
        run: () => {
            // allow stream for sending sensors data
            const { smartHome } = device;
            const { ws, data } = smartHome;
            ws.allowStream = true;
            ws.on('message', (msg) => {
                let res = objify(msg);
                if (res === false) { ws.send(deserializeError); return; };
                // if stream
                if (res.type === 'stream') {
                    if (res.stream === 'sensors') {
                        const { suhu, gas } = res.data;
                        data.suhu = suhu;
                        data.gas = gas;
                        console.log(data);
                        return;
                    }
                    ws.send(stringify({
                        msg: "error",
                        err: "no stream found"
                    }));
                }
            })
        },
        data: {
            suhu: undefined,
            gas: undefined,
        },
    },
};

const usersModule = {
    user: class {
        constructor(ws) {
            this.ws = ws;
            this.id = ws.device;
        }
        run() {
            const { user } = device;
            const { ws, data } = user;

            // modes code(switch)
            const mode = {
                currentMode: "init",
                script: {
                    sensorStream: () => {
                        console.log("entering stream");
                    }
                },
            };
            //Switch the mode 
            ws.on('message', (msg) => {
                let res = objify(msg);
                if (res.msg === "change mode")
                    mode.script[res.mode]();
            })
        }
    },
    users: [],
}

// depricated:
// // if all device is connected
// var alreadyActive = false;
// function activateSystem() {
//     if (alreadyActive) return;
//     for (const [key, value] of Object.entries(device))
//         if (value.ws === undefined)
//             return;
//     console.log('\nactivating the whole system:');
//     for (const [key, value] of Object.entries(device)) {
//         value.run(value.ws);
//         console.log(`${key} has been activated`);
//     }
//     console.log('all system activated\n');
//     alreadyActive = true;
// }


// for identify
wss.on('connection', (ws) => {
    console.log(`connection attemp been made`);
    ws.send(stringify({ msg: "identity requested" }));

    // ws variables
    // identification needed before progressing
    ws.allowed = false;
    ws.allowStream = false;
    ws.device = "unknown";
    // send log
    ws.log = (logout) => { console.log(`${ws.device}: ${logout}`) };
    const { log } = ws;
    // code for starting connection and handle web client
    ws.on('message', (msg) => {
        // turn it into json
        let res = objify(msg);

        // if its not json
        if (res === false) {
            if (!ws.allowStream) {
                ws.send(deserializeError);
                log(`not a valid json, input is: ${msg}`);
                return;
            }
            // stream code here
            return;
        }

        // client connect request
        if (res.msg === "connectClient") {
            if (alreadyConnected(ws)) return;
            ws.device = `client:${getUniqueID()}`
            usersModule.users.push(new usersModule.user(ws));
            ws.send(stringify({
                msg:"connected"
            }))
            console.log(usersModule.users);
            return;
        }

        // identify request
        if (res.msg === 'identity') {
            // if already connected
            if (alreadyConnected(ws)) return;
            // check if device type legit
            if (!Object.keys(device).includes(res.device)) {
                ws.send(stringify({
                    msg: "error",
                    err: "access denied, device type not found"
                }));
                log('denied, device not found');
                return;
            }
            // check if other device already connected as ws.device
            if (device[res.device].ws !== undefined && res.device != 'user') {
                ws.send(stringify({
                    msg: "error",
                    err: `a device already connected as ${res.device}`
                }))
                log(`denied, another device already connected as ${res.device}`);
                return;
            }
            // allow and connected
            ws.device = res.device;
            device[ws.device].ws = ws;
            ws.allowed = true;
            ws.send(stringify({
                msg: "connected",
                details: `connected sucsesfully as ${ws.device}`
            }))
            log('device connected');
            // run local script
            device[ws.device].run();
            return;
        }

        // codes below only accesseble when identified
        if (!ws.allowed) {
            // send error that the request didn't macht any code or keyword
            ws.send(stringify({
                msg: "error",
                err: "unknown request"
            }))
            log(`uknown request, request is: ${msg}`);
            return;
        }

    })
})





// common function
// turn string into json SAFELY 
function objify(str) {
    try {
        return jsonify(String(str));
    } catch (e) {
        return false;
    }
}

// make id for websocket
function getUniqueID() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};

// check if device already connected
function alreadyConnected(ws) {
    if (ws.device != 'unknown') {
        ws.send(stringify({
            msg: "error",
            err: `acces denied, this device already connected as ${ws.device}`
        }));
        ws.log(`relogin attemp, denied`);
        return true;
    }
    return false;
}

// init
app.use(express.static(`${__dirname}/public`));
server.listen(port, () => { console.log(`server is up on port ${port}!`); })


// request example:
/*

    {
        "msg":"identity",
        "device":"smartHome"
    }
    
    {
        "msg": "connectClient"
    }
     

    {
        "type":"stream",
        "stream":"sensors",
        "data": {
            "suhu": "20",
            "gas": {
                "co": "69",
                "lpg": "420",
                "smoke": "0"
            }
        }
    }
*/
