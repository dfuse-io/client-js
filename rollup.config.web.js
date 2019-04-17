const { terser } = require("rollup-plugin-terser")

const configBuilder = require("./rollup.config")
const pkg = require("./package.json")

export default configBuilder(
  {
    file: pkg.browser,
    name: "dfuseClient",
    format: "umd",
    sourcemap: true
  },
  {
    resolve: {
      browser: true
    },
    postPlugins: [terser()]
  }
)
