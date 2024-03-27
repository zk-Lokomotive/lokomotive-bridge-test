import { setDefaultWasm } from "@certusone/wormhole-sdk/lib/cjs/solana/wasm";

import { spy_listen } from "./spy_listen";
import { spy_worker } from "./spy_worker";
import { spy_rest } from "./spy_rest";
import * as helpers from "./helpers";
import { RelayerEnvironment, validateEnvironment } from "./configureEnv";

var pendingMap = new Map<string, string>();
pendingMap.set("XXX", "XXX should be first");
pendingMap.set("CCC", "CCC should be second");
pendingMap.set("XXX", "XXX should still be first");
pendingMap.set("AAA", "AAA should be third");

for (let [pk, pendingValue] of pendingMap) {
  console.log("key: [" + pk + "], value: [" + pendingValue + "]");
}

while (pendingMap.size !== 0) {
  const first = pendingMap.entries().next();

  console.log(
    "deleting first item, which is: key: [" +
      first.value[0] +
      "], value: [" +
      first.value[1] +
      "]"
  );

  pendingMap.delete(first.value[0]);

  for (let [pk, pendingValue] of pendingMap) {
    console.log("key: [" + pk + "], value: [" + pendingValue + "]");
  }
}

var listenOnly: boolean = false;
for (let idx = 0; idx < process.argv.length; ++idx) {
  if (process.argv[idx] === "--listen_only") {
    console.log("running in listen only mode, will not forward to redis");
    listenOnly = true;
    break;
  }
}

require("dotenv").config();

setDefaultWasm("node");

const env: RelayerEnvironment = validateEnvironment();

var runListen: boolean = true;
var runWorker: boolean = true;
var runRest: boolean = true;
var foundOne: boolean = false;

for (let idx = 0; idx < process.argv.length; ++idx) {
  if (process.argv[idx] === "--listen_only") {
    if (foundOne) {
      console.error(
        'May only specify one of "--listen_only", "--worker_only" or "--rest_only"'
      );
      process.exit(1);
    }
    runWorker = false;
    runRest = false;
    foundOne = true;
  }

  if (process.argv[idx] === "--worker_only") {
    if (foundOne) {
      console.error(
        'May only specify one of "--listen_only", "--worker_only" or "--rest_only"'
      );
      process.exit(1);
    }
    runListen = false;
    runRest = false;
    foundOne = true;
  }

  if (process.argv[idx] === "--rest_only") {
    if (foundOne) {
      console.error(
        'May only specify one of "--listen_only", "--worker_only" or "--rest_only"'
      );
      process.exit(1);
    }
    runListen = false;
    runWorker = false;
    foundOne = true;
  }
}

// Start the spy listener to listen to the guardians.
if (runListen) {
  spy_listen(runWorker);
}

// Start the spy worker to process VAAs from the store.
if (runWorker) {
  spy_worker();
}

// Start the REST server, if configured.
if (runRest && process.env.SPY_REST_PORT) {
  var restPort = parseInt(process.env.SPY_REST_PORT);
  if (!restPort) {
    console.error(
      "Environment variable SPY_REST_PORT is set to [%s], which is not a valid port number.",
      process.env.SPY_REST_PORT
    );
    process.exit(1);
  }

  spy_rest(restPort);
}
