import { EOSClient } from "../src/client/eos-client"

const client = new EOSClient()

client.connect().then(() => {
  const request = client.getTransaction(
    {},
    { id: "d9e98cec9fcb5604da38ca250eb22246520bfeee2c35298032c2fbb825eb406d" }
  )

  request.listen((message) => {
    console.log("message: ", message)
  })

  setTimeout(() => {
    console.log("unlistening................")
    request.unlisten()
  }, 4000)
})
