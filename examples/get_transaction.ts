import { EOSClient } from "../src/client/eos-client"
import { socketFactory } from "./config"

const client = new EOSClient(socketFactory)

client.connect().then(() => {
  const request = client.getTransaction(
    "d9e98cec9fcb5604da38ca250eb22246520bfeee2c35298032c2fbb825eb406d"
  )

  request.listen((type, message) => {
    console.log("message: ", message)
  })

  setTimeout(() => {
    request.unlisten()
  }, 4000)
})
