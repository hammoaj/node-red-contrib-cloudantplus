/**
 * Copyright 2014,2018 IBM Corp.
 * Copyright 2021 NotesSensei
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

// Internal Utility functions commonly used by all Nodes

// number of connection retries
const DEFAULT_RETRIES = 5;
// timeout between retries
const DEFAULT_TIMEOUT = 1000;
// How often should requests get attempted?
const MAX_ATTEMPTS = 3;

// Extracts options from msg, tries msg.options first.
// falls back to payload for backward compatibility
const getOptions = (msg) => {
  if (typeof msg.options === "object") {
    return msg.options;
  }
  return typeof msg.payload === "object" ? msg.payload : {};
};

// Check if a field name is valid, either not starts with _
// or is on of the known special names
const allowedWords = [
  "_id",
  "_rev",
  "_attachments",
  "_deleted",
  "_revisions",
  "_revs_info",
  "_conflicts",
  "_deleted_conflicts",
  "_local_seq",
];

const isFieldNameValid = (key) => {
  return key.substr(0, 1) !== "_" || allowedWords.indexOf(key) >= 0;
};

// fix field values that start with _
// https://wiki.apache.org/couchdb/HTTP_Document_API#Special_Fields
const cleanMessage = (msg, warn) => {
  if (Array.isArray(msg)) {
    return msg.map((m) => cleanMessage(m, warn));
  }

  for (const key in msg) {
    if (msg.hasOwnProperty(key) && !isFieldNameValid(key)) {
      // remove _ from the start of the field name
      const newKey = key.substring(1, msg.length);
      msg[newKey] = msg[key];
      delete msg[key];
      warn(`Property '${key}' renamed to '${newKey}'.`);
    }
  }

  return msg;
};

// Ensure a message is most likely valid JSON
const parseMessage = (msg, root) => {
  if (typeof msg !== "object") {
    try {
      msg = JSON.parse(msg);
      // JSON.parse accepts numbers, so make sure that an
      // object is return, otherwise create a new one
      if (typeof msg !== "object") {
        msg = JSON.parse(`{"${root | "data"}":"${msg}"}`);
      }
    } catch (e) {
      // payload is not in JSON format
      msg = JSON.parse(`{"${root}":"${msg}"}`);
    }
  }
  return cleanMessage(msg);
};

// remove invalid characters from the database name
// https://wiki.apache.org/couchdb/HTTP_database_API#Naming_and_Addressing
const cleanDatabaseName = (database, warn) => {
  var newDatabase = database;

  // caps are not allowed
  newDatabase = newDatabase.toLowerCase();
  // remove trailing underscore
  newDatabase = newDatabase.replace(/^_/, "");
  // remove spaces and slashed
  newDatabase = newDatabase.replace(/[\s\\/]+/g, "-");

  if (newDatabase !== database) {
    warn("Database renamed  as '" + newDatabase + "'.");
  }

  return newDatabase;
};

// Handling of query parameters
const formatSearchQuery = (query) => {
  if (typeof query === "object") {
    // useful when passing the query on HTTP params
    if ("q" in query) {
      return query.q;
    }

    var queryString = "";
    for (var key in query) {
      queryString += key + ":" + query[key] + " ";
    }

    return queryString.trim();
  }
  return query;
};

// Get the id, fallback to _id if id not available
const getDocumentId = (payload) => {
  if (typeof payload === "object") {
    if ("_id" in payload || "id" in payload) {
      return payload.id || payload._id;
    }
  }
  return payload;
};

// Works around the issue that false | undefined and null are
// all kind of "falsy"
const getBooleanIfUndefined = (source, defaultValue) => {
  if (typeof source === "boolean") {
    return source;
  }
  return defaultValue;
};

// Status Updates
const status = {
  disconnected: (node, msg) =>
    node.status({ fill: "grey", shape: "ring", text: msg || "disconnected" }),
  connected: (node, msg) =>
    node.status({ fill: "green", shape: "dot", text: msg || "connected" }),
  transmitting: (node, msg) =>
    node.status({ fill: "green", shape: "dot", text: msg || "transmitting" }),
  retry: (node, msg) =>
    node.status({ fill: "yellow", shape: "ring", text: msg || "retrying..." }),
  error: (node, msg) =>
    node.status({ fill: "red", shape: "dot", text: msg || "Error" }),
};

// Export the utility functions
module.exports = {
  DEFAULT_RETRIES,
  DEFAULT_TIMEOUT,
  MAX_ATTEMPTS,
  cleanDatabaseName,
  formatSearchQuery,
  getBooleanIfUndefined,
  getDocumentId,
  getOptions,
  parseMessage,
  status,
};
