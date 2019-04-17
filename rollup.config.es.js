const configBuilder = require("./rollup.config")
const pkg = require("./package.json")

export default configBuilder(
  { file: pkg.module, format: "es", sourcemap: true },
  { external: ["os", "tty", "util"] }
)
