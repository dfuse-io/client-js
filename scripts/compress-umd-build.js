const fs = require("fs")
const zlib = require("zlib")

const directory = "dist"
const filePattern = `${directory}/dfuse-client.umd`

async function main() {
  await zip(`${filePattern}.js`, `${filePattern}.js.gz`)
  await zip(`${filePattern}.js.map`, `${filePattern}.js.map.gz`)

  process.exit(0)
}

async function zip(source, destination) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(source)
      .pipe(zlib.createGzip())
      .pipe(fs.createWriteStream(destination))
      .on("finish", resolve)
      .on("error", reject)
  })
}

main().catch((error) => {
  console.error(error.stack)
  process.exit(1)
})
