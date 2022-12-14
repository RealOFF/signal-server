import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 3000

const wss = new WebSocketServer({ port: PORT })
const users = {}

wss.on('connection', function (connection) {
  connection.on('message', function (message) {
    var data

    try {
      data = JSON.parse(message)
    } catch (e) {
      console.log("Error parsing JSON")
      data = {}
    }
    console.log('data', data)

    switch (data.type) {
      case "login":
        console.log("User logged in as", data.name)
        if (users[data.name]) {
          sendTo(connection, {
            type: "login",
            success: false
          })
        } else {
          users[data.name] = connection
          connection.name = data.name
          sendTo(connection, {
            type: "login",
            success: true
          })
        }

        break
      case "offer":
        console.log("Sending offer to", data.name)
        var conn = users[data.name]

        if (conn) {
          connection.otherName = data.name
          sendTo(conn, {
            type: "offer",
            name: connection.name,
            ...data,
          })
        }

        break
      case "answer":
        console.log("Sending answer to", data.name)
        var conn = users[data.name]

        if (conn) {
          connection.otherName = data.name
          sendTo(conn, {
            type: "answer",
            ...data
          })
        }

        break
      case "candidate":
        console.log("Sending candidate to", data.name)
        var conn = users[data.name]

        if (conn) {
          sendTo(conn, {
            type: "candidate",
            ...data
          })
        }

        break
      case "leave":
        console.log("Disconnecting user from", data.name)
        var conn = users[data.name]

        if (conn) {
          conn.otherName = null

          sendTo(conn, {
            type: "leave"
          })
        }

        break
      default:
        sendTo(connection, {
          type: "error",
          message: "Unrecognized command: " + data.type
        })

        break
    }
  })

  connection.on('close', function () {
    if (connection.name) {
      console.log(connection.name, 'closed')
      delete users[connection.name]

      if (connection.otherName) {
        console.log("Disconnecting user from", connection.otherName)
        var conn = users[connection.otherName]
        conn.otherName = null

        if (conn) {
          sendTo(conn, {
            type: "leave"
          })
        }
      }
    }
  })
})

function sendTo(conn, message) {
  conn.send(JSON.stringify(message))
}

wss.on('listening', function () {
  console.log("Server started...")
})