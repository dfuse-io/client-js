const { set } = require("shelljs")
const url = require("url")

const pkg = require("../package.json")

module.exports = {
  githubPushUrl() {
    const repoUrl = url.parse(pkg.repository)

    const githubToken = process.env.GITHUB_API_TOKEN
    if (githubToken) {
      return `https://${githubToken}@${repoUrl.host + repoUrl.path}`
    }

    return `git@${repoUrl.host}:${repoUrl.path}.git`
  },

  exitOnError(worker) {
    set("-e")
    worker()
    set("+e")
  },

  continueOnError(worker) {
    set("+e")
    worker()
    set("-e")
  }
}
