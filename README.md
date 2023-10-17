# node-red-node-cf-cloudant

A set of [Node-RED](http://nodered.org) nodes to work with documents
in a [Cloudant](https://cloud.ibm.com/catalog/services/cloudant) database that is integrated with
[IBM Cloud](https://cloud.ibm.com/) or an on-premises [CouchDB](https://couchdb.apache.org). This version is a
superset of the functionality in the original Cloudant node and replicates
the functionality of the **node-red-contrib-cloudantplus** node and will eventually replace it.

## Installation

Ideally, install from the package manager inside Node-RED.

Alternatively, install from [npm](http://npmjs.org)

```bash
npm install node-red-node-cf-cloudant
```

## Usage

Allows access to a [Cloudant](http://cloudant.com) or [CouchDB](https://couchdb.apache.org) database to
`insert`, `update`, `delete` and `search` for documents. Also `bulk` operations are supported.

An additional node allows to retrieve information about server and databases

To **insert** a new document into the database you have the option to store
the entire `msg` object or just the `msg.payload`. If the input value is not
in JSON format, it will be transformed before being stored. If `msg` or `msg.payload` is an array,
all elements will be processed using the **bulk operations API**.

For **update** and **delete**, you must pass the `_id` and the `_rev`as part
of the input `msg.payload` object. **Bulk operations** are also supported when putting documents as
an array in the input `msg.payload` object.

To **search** for a document you have five options:

- get a document directly by its `_id`
- use [query](https://cloud.ibm.com/apidocs/cloudant?code=node#postfind)
- use an existing [search index](https://cloud.ibm.com/apidocs/cloudant?code=node#postsearch) from the database
- use an existing [view](https://cloud.ibm.com/apidocs/cloudant?code=node#postview)
- retrieve all documents

## Take note

- When getting documents by id, the `payload` will be the desired `_id` value.
- For `query`, the `payload` will be the set to an object with a [declarative JSON query syntax](https://cloud.ibm.com/apidocs/cloudant?code=node#postfind).
- For `search indexes`, the query should follow the format `indexName:value`.
- For `views` and `all docs`, `payload` should be set be set to an object containing key/value pairs as defined in the Query string section in the [Cloudant documentation](https://cloud.ibm.com/apidocs/cloudant?code=node#postview)

## Dependencies

- [cfenv](https://www.npmjs.com/package/cfenv) - Package to retrieve configuration settings if availble
- [@ibm-cloud/cloudant](https://www.npmjs.com/package/@ibm-cloud/cloudant) - IBM Cloudant SDK

## Authors

- Adam Hammond - [adam_hammond@uk.ibm.com](mailto:adam_hammond@uk.ibm.com)
- Stephan H. Wissel [stw@linux.com](mailto:stw@linux.com)

Based on the node written and enhanced by:

- Austin Chang - [austinhc@tw.ibm.com](mailto:austinhc@tw.ibm.com)
- Luiz Gustavo Ferraz Aoqui - [laoqui@ca.ibm.com](mailto:laoqui@ca.ibm.com)
- Túlio Pascoal
