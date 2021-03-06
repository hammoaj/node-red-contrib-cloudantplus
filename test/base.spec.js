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

const base = require("../modules/shared/cloudantbase.js");
const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");

const { expect } = chai;
chai.use(chaiAsPromised);

describe("Interacting with Cloudant", () => {
  context("basic auth", () => {
    it("should be a happy day", () => {
      expect(true).to.equal(true);
    });
  });
});
