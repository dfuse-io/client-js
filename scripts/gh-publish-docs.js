const { cd, exec, echo, touch } = require("shelljs")
const { githubPushUrl, exitOnError, continueOnError } = require("./helpers")

echo("Pushing docs...")

exitOnError(() => {
  cd("docs")
  touch(".nojekyll")
  exec("git init")
  exec('git config user.name "--username--"')
  exec('git config user.email "--usermail--"')
})

continueOnError(() => {
  exec("git add .")
  exec('git commit -m "docs(docs): update gh-pages"')
})

exitOnError(() => {
  exec(`git push --force --quiet "${githubPushUrl()}" master:gh-pages`)
})

echo("Docs deployed")
