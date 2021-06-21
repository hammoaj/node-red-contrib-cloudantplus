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
  const data = node.payonly ? msg.payload : msg;
  const isBulkOperation = Array.isArray(data);

  const send = (payload) => {
    rawSend({ ...msg, _msgid, payload });
  };

  // Now do the actual work
  if (isBulkOperation && operation === "insert") {
    handleBulkInsert(service, data, dbName, send, done);
  } else if (operation === "insert") {
    handleInsert(service, data, dbName, send, done);
  } else if (isBulkOperation && operation === "delete") {
    handleBulkDelete(service, data, dbName, send, done);
  } else if (operation === "delete") {
    handleDelete(service, data, dbName, send, done);
  } else {
    done(new Error(`Unknown node operation requested: ${operation}`));
  }
};

// Deletion of one document
const handleDelete = (service, rawDoc, database, send, done) => {
  const doc = base.parseMessage(rawDoc);
  if ("_rev" in doc && "_id" in doc) {
    service
      .deleteDocument({
        db: database,
        docId: doc._id,
        rev: doc._rev,
      })
      .then((body) => send(body))
      .catch((err) => done(err));
  } else {
    done(new Error("_id and _rev are required to delete a document"));
  }
};

// Deletion of an array of documents
const handleBulkDelete = (service, docs, database, send, done) => {
  // Check that documents can be remove in bulk
  docs.forEach((element, index, obj) => {
    if ("_rev" in element && "_id" in element) {
      element._deleted = true;
    } else {
      obj.splice(index, 1);
      done(
        new Error(
          `_id and _rev are required to delete a document ${JSON.stringify(
            element
          )}`
        )
      );
    }
  });

  // Execute action - in bulk delete the _deleted property
  // does the deletion
  base
    .bulkDocumentsWithRetry(service, database, docs, utils.MAX_ATTEMPTS, 1)
    .then((body) => send(body))
    .catch((err) => done(err));
};

// Insert multiple documents into the database
const handleBulkInsert = (service, docs, database, send, done) => {
  // TODO: loop through array, make sure they are objects
  // and comply with namging rule using parseMessage()

  base
    .bulkDocumentsWithRetry(service, database, docs, utils.MAX_ATTEMPTS)
    .then((body) => send(body))
    .catch((err) => done(err));
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
  function CloudantOutNode(n) {
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
    base
      .connecWithRetry(node, node.cloudantConfig, 1)
      .then((service) =>
        node.on("input", (msg, send, done) =>
          handleMessage(service, node, msg, send, done)
        )
      )
      .catch((err) => node.error(err.description, err));
  }

  // Export to NodeRED
  RED.nodes.registerType("cloudantplus out", CloudantOutNode);
};
