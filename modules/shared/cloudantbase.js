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

// Helper functions to interact with a Cloudant database
// Does NOT contain any NodeRED specific code to make the
// module testable in isolation from the CloudantPlus nodes

const ibmsdk = require("@ibm-cloud/cloudant");
const cloudSDK = require("ibm-cloud-sdk-core");
const cfenv = require("cfenv");
const utils = require("./utility.js");
const { CloudantV1 } = ibmsdk;

/**
 * Retrieve the configured cloudant configuration
 * for a given node. Can be based of a selected CF
 * Service or provided in a configuration node
 *
 * @param {NodeRED} RED
 * @param {NodeRed Node} node
 * @returns cloudant config
 */
const getCloudantConfig = (RED, node) => {
  if (node.service === "_ext_") {
    const service = RED.nodes.getNode(node.cloudant);
    return {
      url: service.url,
      username: service.credentials?.username,
      password: service.credentials?.pass,
      apikey: service.credentials?.apikey,
    };
  } else if (node.service !== "") {
    const service = getCloudantService(node.service);
    return {
      url: service.credentials?.url,
      username: service.credentials?.username,
      password: service.credentials?.password,
      apikey: service.credentials?.apikey,
    };
  } else {
    utils.status.error(node, "Configuration missing");
  }
};

/**
 * Retrieve CF service definition including credentials
 *
 * @param {string} serviceName
 * @returns A CF service definition
 */
const getCloudantService = (serviceName) => {
  const appEnv = cfenv.getAppEnv();
  return appEnv.getService(serviceName);
};

/**
 *
 * @returns Cloudant services configured in CloudFoundry, if any
 */
const getCloudantServices = () => {
  const appEnv = cfenv.getAppEnv();

  const services = [];

  // load the services bound to this application
  for (var i in appEnv.services) {
    if (appEnv.services.hasOwnProperty(i)) {
      // filter the services to include only the Cloudant ones
      if (i.match(/^(cloudant)/i) || i.match(/^(couchdb)/i)) {
        const s = appEnv.services[i].map((v) => ({
          name: v.name,
          label: v.label || v.name,
        }));
        s.forEach((e) => services.push(e));
      }
    }
  }

  return services;
};

// Cloudant authenticator, IAM and Basic aware
const createAuthenticator = (credentials) => {
  if (credentials) {
    if (credentials.apikey) {
      // IBM IAM compliant
      return new cloudSDK.IamAuthenticator({
        apikey: credentials.password,
      });
    } else {
      // Fallback to Basic AUTH
      return new cloudSDK.BasicAuthenticator({
        username: credentials.username,
        password: credentials.password,
      });
    }
  } else {
    // Anonymous - probably local use only
    return new cloudSDK.NoAuthAuthenticator();
  }
};

// Connecto to a cloudant server
const connectToService = (credentials) => {
  const authenticator = createAuthenticator(credentials);
  return new Promise((resolve, reject) => {
    const service = CloudantV1.newInstance({
      authenticator: authenticator,
    });
    service.setServiceUrl(credentials.url);
    // We get the server info as means
    // to validate that we have connecivity
    service
      .getServerInformation()
      // returning the service instead of
      // the result is intended an necessary
      .then((result) => resolve(service))
      .catch((err) => reject(err));
  });
};

// get information about a server
const getServerInfo = (service) => {
  return service.getServerInformation();
};

// List of all databases
const getDbList = (service) => {
  return service.getAllDbs();
};

const getDbInfo = (service, dbName) => {
  return service.getDatabaseInformation({ db: dbName });
};

/**
 * Tries to connect. Does it multiple times
 * with a timeout. Good for patchy connections
 *
 * @param {Cloudant Node} node
 * @param {JSON} credentials
 * @param {int} numberOfAttempt
 * @returns
 */
const connecWithRetry = (node, credentials, numberOfAttempt) => {
  utils.status.disconnected(node);
  return new Promise((resolve, reject) => {
    connectToService(credentials)
      .then((service) => createDatabase(service, node.database))
      .then((service) => {
        utils.status.connected(node);
        resolve(service);
      })
      .catch((err) => {
        if (numberOfAttempt <= node.retries) {
          utils.status.retry(node);
          node.debug(`Retry: ${numberOfAttempt}`)
          setTimeout(() => {
            connecWithRetry(node, credentials, numberOfAttempt + 1);
          }, node.timeout);
        } else {
          node.debug("Connecting retries exceeded");
          node.error(err.message, err);
          utils.status.error(node, `Error: ${err.message}`);
          node.debug("Rejecting...");
          reject(err);
        }
      });
  });
};

// Create a database if it doesn't already exist
// Returns the service for fluent use
const createDatabase = (service, dbName) => {
  return new Promise((resolve, reject) => {
    if (dbName) {
      service
        .headDatabase({ db: dbName })
        .then(() => resolve(service))
        .catch((err) => {
          // It doesn't exist, try to create
          service
            .putDatabase({
              db: dbName,
              partitioned: false,
            })
            .then(() => resolve(service))
            .catch((err2) => reject(err2));
        });
    } else {
      // We don't have a name yet
      resolve(service);
    }
  });
};

// Retrieve a single document
const getDocument = (service, database, id) => {
  return service.getDocument({
    db: database,
    docId: id,
  });
};

// Inserts a document +doc+ in a database +db+ that migh not exist
// beforehand. If the database doesn't exist, it will create one
// with the name specified in +db+. To prevent loops, it only tries
// +attempts+ number of times.
const insertDocumentWithRetry = (service, database, doc, attempts) => {
  return new Promise((resolve, reject) => {
    insertDocument(service, database, doc, true)
      .then((body) => resolve(body))
      .catch((err) => {
        if (attempts > 0) {
          insertDoc(service, database, doc, attempts - 1)
            .then((body) => resolve(body))
            .catch((err2) => reject(err2));
        } else {
          reject(err);
        }
      });
  });
};

// Inserts a document into a database it eventually creates
const insertDocument = (service, database, document, createDbIfMissing) => {
  return new Promise((resolve, reject) => {
    service
      .postDocument({
        db: database,
        document: document,
      })
      .then((response) => resolve(response))
      .catch((err) => {
        // 404 - database doesn't exist
        if (createDbIfMissing && err.status == 404) {
          createDatabase(service, database)
            .then(() =>
              insertDocument(service, database, document, false)
                .then((result) => resolve(result))
                .catch((erra) => reject(erra))
            )
            .catch((err2) => reject(err2));
        } else {
          reject(err);
        }
      });
  });
};

// Bulk operation on documents +doc+ in a database +db+ that migh not exist
// beforehand. If the database doesn't exist, it will create one
// with the name specified in +db+. To prevent loops, it only tries
// +attempts+ number of times.
const bulkDocumentsWithRetry = (service, database, docs, attempts) => {
  return new Promise((resolve, reject) => {
    bulkDocuments(service, database, docs, true)
      .then((body) => resolve(body))
      .catch((err) => {
        if (attempts > 0) {
          bulkDocs(service, database, docs, attempts - 1)
            .then((body) => resolve(body))
            .catch((err2) => reject(err2));
        } else {
          reject(err);
        }
      });
  });
};

// Bulk operations into a database it eventually creates
const bulkDocuments = (service, database, documents, createDbIfMissing) => {
  return new Promise((resolve, reject) => {
    service
      .postDocument({
        db: database,
        bulkdocs: { docs: documents },
      })
      .then((response) => resolve(response))
      .catch((err) => {
        // 404 - database doesn't exist
        if (createDbIfMissing && err.status_code == 404) {
          createDatabase(service, database)
            .then(() =>
              bulkDocuments(service, database, documents, false)
                .then((result) => resolve(result))
                .catch((erra) => reject(erra))
            )
            .catch((err2) => reject(err2));
        } else {
          reject(err);
        }
      });
  });
};

// Look for documents in a search index
const searchQuery = (service, database, design, index, query, options) => {
  return service.postSearch({
    db: database,
    ddoc: design,
    index: index,
    query: query,
    ...options,
  });
};

// Find by seleector
const findBySelector = (service, database, options) => {
  return service.postFind({
    ...options,
    db: database,
  });
};

const byView = (service, database, design, view, options) => {
  return service.postView({
    db: database,
    ddoc: design,
    view: view,
    ...options,
  });
};

const allDocs = (service, database, options) => {
  return service.postAllDocs({
    db: database,
    ...options,
  });
};

// Makes HTTP endpoints available that are
// used by the Node configurartion
const openHttpEndpoints = (RED) => {
  // List of CF provided endpoints
  RED.httpAdmin.get("/cloudant/vcap", function (req, res) {
    res.send(JSON.stringify(getCloudantServices()));
  });
};

module.exports = {
  allDocs,
  bulkDocuments,
  bulkDocumentsWithRetry,
  byView,
  connectToService,
  connecWithRetry,
  createAuthenticator,
  createDatabase,
  findBySelector,
  getCloudantConfig,
  getCloudantService,
  getCloudantServices,
  getDbInfo,
  getDbList,
  getDocument,
  getServerInfo,
  insertDocument,
  insertDocumentWithRetry,
  openHttpEndpoints,
  searchQuery,
};
