node-red-contrib-cloudantplus
=========================
A pair of [Node-RED](http://nodered.org) nodes to work with documents
in a [Cloudant](http://cloudant.com) database that is integrated with
[IBM Bluemix](http://bluemix.net).

Install
-------
Ideally, install from the package manager inside Node-RED.

Alternatively, install from [npm](http://npmjs.org)
```
npm install node-red-contrib-cloudantplus
```

Usage
-----
Allows basic access to a [Cloudant](http://cloudant.com) database to
`insert`, `update`, `delete` and `search` for documents.

To **insert** a new document into the database you have the option to store
the entire `msg` object or just the `msg.payload`. If the input value is not
in JSON format, it will be transformed before being stored.

For **update** and **delete**, you must pass the `_id` and the `_rev`as part
of the input `msg` object.

To **search** for a document you have three options:
* get a document directly by its `_id`
* use an existing [search index](https://cloudant.com/for-developers/search/)
from the database
* use an existing [view](https://console.bluemix.net/docs/services/Cloudant/api/using_views.html#using-views)

When getting documents by id, the `payload` will be the desired `_id` value.

For `search indexes`, the query should follow the format `indexName:value`.

For `views`, `payload` should be set be set to an object containing key/value pairs
as defined in the Query string section in the [Cloudant documentation](https://console.bluemix.net/docs/services/Cloudant/api/using_views.html#using-views)

Authors
-------
* Adam Hammond - [adam_hammond@uk.ibm.com](mailto:adam_hammond@uk.ibm.com)

Based on the node written by:
* Luiz Gustavo Ferraz Aoqui - [laoqui@ca.ibm.com](mailto:laoqui@ca.ibm.com)
* Túlio Pascoal
