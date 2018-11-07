const { defaults } = require("jest-config")

module.exports = {
  moduleDirectories: ["<rootDir>/node_modules"],
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "tsx"],
  moduleNameMapper: {},
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testEnvironment: "jsdom",
  testRegex: "((\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  coverageThreshold: {
    global: {
      branches: 42.4,
      lines: 62.1,
      functions: 33.8,
      statements: 62.0
    }
  },
  collectCoverage: true,
  coverageReporters: ["json", "html"]
}
