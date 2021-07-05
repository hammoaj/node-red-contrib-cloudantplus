/**
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

// Test functions for cloudantbase functions, requires a running local CouchDB

const utils = require("../modules/shared/utility.js");
const chai = require("chai");
const sinon = require("sinon");

const { expect } = chai;

describe("Testing constant values", () => {
  it("DEFAULT_RETRIES should be 5", () => {
    expect(utils.DEFAULT_RETRIES).to.equal(5);
  });
  it("DEFAULT_TIMEOUT should be 5", () => {
    expect(utils.DEFAULT_TIMEOUT).to.equal(1000);
  });
  it("MAX_ATTEMPTS should be 5", () => {
    expect(utils.MAX_ATTEMPTS).to.equal(3);
  });

  it("allowedWord should have 9 members", () => {
    expect(utils.allowedWords.length).to.equal(9);
  });
});

describe("Parse messages to be valid JSON", () => {
  // TODO: implement test
});

describe("database names need to follow naming conventions", () => {
  it("should pass a clean name right through", () => {
    expect(utils.cleanDatabaseName("goodboy", console.log)).to.equal("goodboy");
  });

  it("Lowercase names", () => {
    expect(utils.cleanDatabaseName("GoodBoy", console.log)).to.equal("goodboy");
  });
  it("should cleanup messy names", () => {
    expect(utils.cleanDatabaseName("_Good boy~/* 66_", console.log)).to.equal(
      "good-boy-66"
    );
  });
});

describe("Format search queries from a source", () => {
  // TODO implement this
});

describe("extract id from payload", () => {
  it("should return a string as a string", () => {
    expect(utils.getDocumentId("This is not an object")).to.equal(
      "This is not an object"
    );
  });

  it("should return object if no id or _id is contained", () => {
    expect(utils.getDocumentId({ truth: 42 })).to.eql({ truth: 42 });
  });

  it("should return id if _id is available", () => {
    expect(utils.getDocumentId({ _id: 42 })).to.equal(42);
  });

  it("should return id if id is available", () => {
    expect(utils.getDocumentId({ id: 42 })).to.equal(42);
    expect(utils.getDocumentId({ id: 42, _id: 43 })).to.equal(42);
  });
});

describe("Testing Option extraction", () => {
  const simpleMsg = { options: { answer: 42 } };
  const simpleMsg2 = { payload: { color: "red" } };
  const complexMsg = { options: { answer: 42 }, payload: { color: "red" } };
  const complexMsg2 = { options: true, payload: { color: "red" } };
  const complexMsg3 = { options: "blue", payload: "test" };
  it("should return {} on non object msg", () => {
    expect(utils.getOptions(null)).to.eql({});
    expect(utils.getOptions("Demo")).to.eql({});
  });

  it("should return options object", () => {
    expect(utils.getOptions(simpleMsg)).to.eql({ answer: 42 });
    expect(utils.getOptions(simpleMsg2)).to.eql({ color: "red" });
    expect(utils.getOptions(complexMsg)).to.eql({ answer: 42 });
    expect(utils.getOptions(complexMsg2)).to.eql({ color: "red" });
    expect(utils.getOptions(complexMsg3)).to.eql({});
  });
});

describe("Testing the boolean function", () => {
  it("should return the default when called non booleans", () => {
    expect(utils.getBooleanIfUndefined(null, true)).to.equal(true);
    expect(utils.getBooleanIfUndefined(null, false)).to.equal(false);
    expect(utils.getBooleanIfUndefined("Joe", true)).to.equal(true);
    expect(utils.getBooleanIfUndefined("Frank", false)).to.equal(false);
    expect(utils.getBooleanIfUndefined(0, true)).to.equal(true);
    expect(utils.getBooleanIfUndefined(0, false)).to.equal(false);
    expect(utils.getBooleanIfUndefined(42, true)).to.equal(true);
    expect(utils.getBooleanIfUndefined(42, false)).to.equal(false);
    expect(utils.getBooleanIfUndefined({ truth: 42 }, true)).to.equal(true);
    expect(utils.getBooleanIfUndefined({ truth: 42 }, false)).to.equal(false);
  });
  it("should return the source boolean", () => {
    expect(utils.getBooleanIfUndefined(false, true)).to.equal(false);
    expect(utils.getBooleanIfUndefined(false, false)).to.equal(false);
    expect(utils.getBooleanIfUndefined(true, true)).to.equal(true);
    expect(utils.getBooleanIfUndefined(true, false)).to.equal(true);
    expect(utils.getBooleanIfUndefined(undefined, true)).to.equal(true);
    expect(utils.getBooleanIfUndefined(undefined, false)).to.equal(false);
    expect(utils.getBooleanIfUndefined(null, true)).to.equal(true);
    expect(utils.getBooleanIfUndefined(null, false)).to.equal(false);
    expect(utils.getBooleanIfUndefined({}, false)).to.equal(false);
  });
});

describe("Testing the status function", () => {
  const simulatedNode = {
    status: (fill, shape, text) => {
      // Dummy, no action
    },
  };

  it("should use default messages", () => {
    let status = sinon.spy(simulatedNode, "status");
    utils.status.disconnected(simulatedNode);
    expect(status.lastCall.lastArg).to.eql({
      fill: "grey",
      shape: "ring",
      text: "disconnected",
    });
    utils.status.connected(simulatedNode);
    expect(status.lastCall.lastArg).to.eql({
      fill: "green",
      shape: "dot",
      text: "connected",
    });
    utils.status.transmitting(simulatedNode);
    expect(status.lastCall.lastArg).to.eql({
      fill: "green",
      shape: "ring",
      text: "transmitting",
    });
    utils.status.retry(simulatedNode);
    expect(status.lastCall.lastArg).to.eql({
      fill: "yellow",
      shape: "ring",
      text: "retrying...",
    });
    utils.status.error(simulatedNode);
    expect(status.lastCall.lastArg).to.eql({
      fill: "red",
      shape: "dot",
      text: "Error",
    });
  });
});
