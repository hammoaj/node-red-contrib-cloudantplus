/* This is the configuration for the wallaby test runner */
module.exports = function (wallaby) {
  return {
    files: ["modules/**/*.*js"],
    tests: ["test/**/*.spec.*js"],

    env: {
      type: "node",
      runner: "node",
    },
    testFramework: "mocha",
    reportConsoleErrorAsError: true,
  };
};
