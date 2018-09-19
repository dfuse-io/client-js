import express from "express";
import expressWs from "express-ws";
import http from "http";
import WebSocket from "ws";

// Let's read from an EOS node
import { NodeosActionReader } from "demux-eos";

// Ties everything together in a polling loop
import { BaseActionWatcher } from "demux";

// Assuming you've created your own subclass of AbstractActionHandler
import MyActionHandler from "./src/MyActionHandler";

// Import Updaters and Effects, which are arrays of objects:
// [ { actionType: string, (updater|effect): function }, ... ]
import effects from "./src/effects";
import updaters from "./src/updaters";

const actionReader = new NodeosActionReader(
  "https://api.eosn.io", // Locally hosted node needed for reasonable indexing speed
  16212921, // First actions relevant to this dapp happen at this block
);

const actionHandler = new MyActionHandler(
  updaters,
  effects,
);

const actionWatcher = new BaseActionWatcher(
  actionReader,
  actionHandler,
  250, // Poll at twice the block interval for less latency
);

actionWatcher.watch(); // Start watch loop

const {app} = expressWs(express());

app.ws("/", (ws, req: any) => {
  ws.on("message", (msg) => {
    console.log(msg);
  });
  console.log("socket", req.testing);
});

app.listen(3000);

// wss.on("connection", (ws: WebSocket) => {

//     // connection is up, let's add a simple simple event
//     ws.on("message", (message: string) => {

//         // log the received message and send it back to the client
//         console.log("received: %s", message);
//         ws.send(`Hello, you sent -> ${message}`);
//     });

//     // send immediatly a feedback to the incoming connection
//     ws.send("Hi there, I am a WebSocket server");
// });

// // start our server
// server.listen(process.env.PORT || 8999, () => {
//     console.log(`Server started on port ${server.address()} :)`);
// });
