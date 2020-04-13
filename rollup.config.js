const { builtinModules } = require("module")
const resolve = require("rollup-plugin-node-resolve")
const commonjs = require("rollup-plugin-commonjs")
const sourceMaps = require("rollup-plugin-sourcemaps")
const typescript = require("rollup-plugin-typescript2")
const json = require("rollup-plugin-json")
const { terser } = require("rollup-plugin-terser")
const ignore = require("rollup-plugin-ignore")
const babel = require("rollup-plugin-babel")

const pkg = require("./package.json")

module.exports = {
  esBuild: () =>
    build({
      output: { file: pkg.module, format: "es", sourcemap: true },
      external: ["crypto", "debug", "fs", "os", "path"]
    }),

  umdBuild: () =>
    build({
      output: {
        file: pkg.browser,
        name: "dfuseClient",
        format: "umd",
        sourcemap: true
      },
      resolve: {
        browser: true
      },
      prePlugins: [ignore(builtinModules)],
      postPlugins: [terser()]
    })
}

function build(options) {
  return {
    input: `src/index.ts`,
    output: options.output,
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
      babel({
        exclude: "node_modules/**" // only transpile our source code
      }),
      ...(options.postPlugins || [])
    ]
  }
}
