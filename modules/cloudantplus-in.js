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

// Process messages
const handleMessage = (service, node, msg, rawSend, done) => {
  const dbName = msg.database || node.database;
  const operation = msg.operation || node.search;
  const options = utils.getOptions(msg);

  const send = (payload) => {
    rawSend({ ...msg, payload });
  };

  if (operation === "_id_") {
    var id = utils.getDocumentId(msg.payload);
    base
      .getDocument(service, dbName, id)
      .then((body) => send(body))
      .catch((err) => done(err));
  } else if (operation === "_idx_") {
    const query =
      msg.query ||
      msg.q ||
      options.query ||
      options.q ||
      utils.formatSearchQuery(msg.payload);
    options.include_docs = utils.getBooleanIfUndefined(
      options.include_docs,
      true
    );
    options.limit = options.limit || 200;
    base
      .searchQuery(service, dbName, node.design, node.index, query, options)
      .then((body) => send(body))
      .catch((err) => done(err));
  } else if (operation === "_query_") {
    base
      .findBySelector(service, dbName, options)
      .then((body) => send(body))
      .catch((err) => done(err));
  } else if (operation === "_view_") {
    base
      .byView(service, dbName, node.design, node.index, options)
      .then((body) => send(body))
      .catch((err) => done(err));
  } else if (operation === "_all_") {
    //options.include_docs = utils.getBooleanIfUndefined(
    //  options.include_docs,
    //  true
    //);
    node.debug(JSON.stringify(options));
    base
      .allDocs(service, dbName, options)
      .then((body) => send(body))
      .catch((err) => done(err));
  } else {
    done(new Error(`Unknown node operation requested: ${operation}`));
  }
};

// The main action
module.exports = (RED) => {
  // HTTP endpoints that will be accessed from the HTML file
  base.openHttpEndpoints(RED);

  // Create and register Cloudant-In Node
  function CloudantInNode(n) {
    RED.nodes.createNode(this, n);

    const node = this;

    node.search = n.search;
    node.design = n.design;
    node.index = n.index;
    node.inputId = "";

    // Shared by all nodes
    node.database = utils.cleanDatabaseName(n.database, this.warn);
    node.cloudantConfig = base.getCloudantConfig(RED, n);
    node.retries = n.retries || utils.DEFAULT_RETRIES;
    node.timeout = n.timeout || utils.DEFAULT_TIMEOUT;

    // Connect to service and start listening to incoming msg
    
    node.on("input", (msg, send, done) => {
      node.debug("Connecting...");
      base
      .connectWithRetry(node, node.cloudantConfig)
      .then((service) => {node.debug("Connected..."); handleMessage(service, node, msg, send, done)})
      .catch((err) => {node.debug("Error connecting..."); done(err)})
    })
    
  }

  // Export to NodeRED
  RED.nodes.registerType("cloudantplus in", CloudantInNode);
};
