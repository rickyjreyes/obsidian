"use strict";

const input = require("./graph-input");
const inspector = require("./graph-inspector-v071");
const combined = {};
for (const source of [input, inspector]) {
  for (const name of Object.getOwnPropertyNames(source)) {
    if (name !== "constructor") {
      Object.defineProperty(combined, name, Object.getOwnPropertyDescriptor(source, name));
    }
  }
}
module.exports = combined;