"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.closeBridgeDatabase = exports.getBridgeCollection = exports.getBridgeDatabase =
  exports.connectBridgeDatabase =
    void 0;

const mongodb_1 = require("mongodb");
const functions_1 = require("../functions");

let bridgeClient = null;
let bridgeDb = null;
let bridgePromise = null;

function resolveBridgeDbName() {
  return process.env.MANAGER_BRIDGE_DB_NAME || "manager_bridge";
}

const connectBridgeDatabase = async () => {
  if (bridgeDb) {
    return bridgeDb;
  }

  if (bridgePromise) {
    return bridgePromise;
  }

  bridgePromise = (async () => {
    const uri = (0, functions_1.getEnv)("MONGO_DB_URL");
    const client = new mongodb_1.MongoClient(uri, {
      family: 4,
      maxPoolSize: 5,
    });
    await client.connect();
    bridgeClient = client;
    bridgeDb = client.db(resolveBridgeDbName());
    return bridgeDb;
  })().catch((error) => {
    bridgePromise = null;
    throw error;
  });

  return bridgePromise;
};
exports.connectBridgeDatabase = connectBridgeDatabase;

const getBridgeDatabase = async () => {
  return bridgeDb || (0, exports.connectBridgeDatabase)();
};
exports.getBridgeDatabase = getBridgeDatabase;

const getBridgeCollection = async (name) => {
  const db = await (0, exports.getBridgeDatabase)();
  return db.collection(name);
};
exports.getBridgeCollection = getBridgeCollection;

const closeBridgeDatabase = async () => {
  if (bridgeClient) {
    await bridgeClient.close();
  }
  bridgeClient = null;
  bridgeDb = null;
  bridgePromise = null;
};
exports.closeBridgeDatabase = closeBridgeDatabase;
