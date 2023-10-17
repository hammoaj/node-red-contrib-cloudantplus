/**
 * Copyright 2014,2018 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

// Imports and common variables
const base = require("./shared/cloudantbase.js");
const utils = require("./shared/utility.js");

// Process messages for insert/update and delete
const handleMessage = (service, node, msg, rawSend, done) => {
  // We overwrite the database from the message if available
  const dbName = msg.database || node.database;
  const operation = msg.operation || node.operation;
  const _msgid = msg._msgid;
  delete msg._msgid;

  const send = (payload) => {
    rawSend({ ...msg, _msgid, payload });
  };

  // Now do the actual work
  if (operation === "server") {
    base
      .getServerInfo(service)
      .then((result) => send(result))
      .catch((err) => done(err));
  } else if (operation === "dblist") {
    base
      .getDbList(service)
      .then((result) => send(result))
      .catch((err) => done(err));
  } else if (operation === "database") {
    base
      .getDbInfo(service, dbName)
      .then((result) => send(result))
      .catch((err) => done(err));
  } else {
    done(new Error(`Unknown node operation requested: ${node.operation}`));
  }
};

// Insert one document into the database
const handleInsert = (service, rawDoc, dbName, send, done) => {
  const doc = utils.parseMessage(rawDoc);

  base
    .insertDocumentWithRetry(service, dbName, doc, utils.MAX_ATTEMPTS)
    .then((body) => send(body))
    .catch((err) => done(err));
};

// The main action
module.exports = (RED) => {
  // HTTP endpoints that will be accessed from the HTML file
  base.openHttpEndpoints(RED);

  // Create and register Cloudant-Out Node
  function CloudantInfoNode(n) {
    RED.nodes.createNode(this, n);

    const node = this;

    node.operation = n.operation;
    node.payonly = n.payonly || false;

    // Shared by all nodes
    node.database = utils.cleanDatabaseName(n.database, node.warn);
    node.cloudantConfig = base.getCloudantConfig(RED, n);
    node.retries = n.retries || utils.DEFAULT_RETRIES;
    node.timeout = n.timeout || utils.DEFAULT_TIMEOUT;

    // Connect to service and start listening to incoming msg
    
    node.on("input", (msg, send, done) => {
      base
      .connectWithRetry(node, node.cloudantConfig)
      .then((service) => {handleMessage(service, node, msg, send, done)})
      .catch((err) => {done(err)})
    })
    
  }

  // Export to NodeRED
  RED.nodes.registerType("cloudantplus info", CloudantInfoNode);
};
