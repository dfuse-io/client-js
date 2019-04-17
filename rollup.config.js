const resolve = require("rollup-plugin-node-resolve")
const commonjs = require("rollup-plugin-commonjs")
const sourceMaps = require("rollup-plugin-sourcemaps")
const typescript = require("rollup-plugin-typescript2")
const json = require("rollup-plugin-json")

module.exports = function build(output, options = {}) {
  return {
    input: `src/index.ts`,
    output,
    external: options.external || [],
    watch: {
      include: "src/**"
    },
    plugins: [
      ...(options.prePlugins || []),
      json(),
      typescript({ useTsconfigDeclarationDir: true }),
      commonjs(),
      resolve(options.resolve),
      sourceMaps(),
      ...(options.postPlugins || [])
    ]
  }
}
