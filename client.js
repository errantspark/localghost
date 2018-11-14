let xyToP  = (x,y) => x+256*y
let pToXy  = (p) => [p%256, p/256|0]

let Archive = function() {
}

let Client = function(options) {
  this.open = false

  let hostname, secure
  if (typeof options === 'string') {
    hostname = options
  } else {
    hostname = options.hostname
    secure = options.secure
  }
  let secS = secure?'s':''

  let wsBaseUrl = `ws${secS}://${hostname}`
  let httpBaseUrl = `http${secS}://${hostname}`

  let archive = new Archive()
  this.history = []

  this.palette = new Array(256).fill(0).map((x,i) => [i,i,i])
  this.onpalette = null
  let handlePalette = palette => {
    palette.forEach((e,i) => this.palette[(i/3)|0][i%3]=e)
    if (this.onpalette) {
      this.onpalette(this.palette)
    }
  }

  this.rawData = new Uint8Array(256*256)
  this.onkeyframe = null 
  let handleKeyframe = keyframe => {
    this.rawData.set(keyframe)
    if (this.onkeyframe) {
      this.onkeyframe(keyframe)
    }
  }

  this.onmessage = null
  this.onmessages = null
  let handleMessages = msgs => {
    let messages = []
    for (let i = 0; i < msgs.length; i += 3) {
      let x = msgs[i]
      let y = msgs[i+1]
      let c = msgs[i+2]
      let pos = x + y * 256
      let prevColor = this.rawData[pos]
      this.rawData[pos] = c
      messages.push([x,y,c])
      this.history.push([x,y,c,prevColor])

      if (this.onmessage) {
        this.onmessage(x,y,c)
      }
    }

    if (this.onmessages) {
      this.onmessage(messages)
    }
  }

  let socket, sendInterval 
  this.open = () => {
    socket = new WebSocket(wsBaseUrl)

    socket.onclose = () => {
      this.open = false
      clearInterval(sendInterval)
    }

    socket.onopen = () => {

      let buffer = []

      this.sync = () => socket.send("fetch")

      this.set = (x,y,c) => {
        let offset = xyToP(x,y)
        buffer.push([x,y,c])
      }

      this.get = (x,y) => {
        let offset = xyToP(x,y)
        return this.rawData[offset]
      }

      let setMany = (msgs) => {
        let msg = []
        msgs.forEach(m => msg.push.apply(msg, m))
        socket.send(new Uint8ClampedArray(msg))
      }

      sendInterval = setInterval(() => {
        if (buffer.length > 0) {
          setMany(buffer)
          buffer = []
        }
      }, 16)

      socket.send('palette')
      socket.send('fetch')
    }

    //this.onopen only runs once the local state is fully initialized
    //palette,keyframe
    let firstRun = true
    //first is true because we don't actually need it because i have a pathological
    //need to put reduces in my code, probably rewrite this so it's explicit
    let messagesReceived = [true, false, false]

    let checkInit = type => {
      messagesReceived[type] = true
      if (messagesReceived.reduce((a,b) => a && b)) {
        firstRun = false
        this.open = true
        if (this.onopen) this.onopen()
      }
    }


    socket.onmessage = message => {
      if(typeof message.data !== "string"){
        var arrayBuffer
        var fileReader = new FileReader()
        fileReader.onload = function(data) {
          let frame = new Uint8Array(data.target.result)
          let type = frame[0]
          let msg = new Uint8Array(data.target.result, 1, data.target.result.byteLength-1)
          switch (type) {
            case 0: //message
              if (firstRun) checkInit(type)
              handleMessages(msg)
              break
            case 1: //full state
              if (firstRun) checkInit(type)
              handleKeyframe(msg)
              break
            case 2: //palette
              if (firstRun) checkInit(type)
              handlePalette(msg)
              break
            case 3: //current partial history
              //hist = parseHist(msg)
              break
          }
        }
        fileReader.readAsArrayBuffer(message.data);
      } else if (typeof message.data === "string") {
        /*
        let data = JSON.parse(message.data)
        if (data.config) {
          config = data.config
        }
        if (data.ts) {
          archiveIndex.push(`snapshot${data.ts}.gz`)
          socket.send('hist')
        }
        */
      }
    }
  }
}

/*
let hist = []
let parseHist = hist => {
  let writes = []
  for (let i = 0; i < hist.length; i+=4){
    writes.push([hist[i],hist[i+1],hist[i+2],hist[i+3]])
  }
  return writes
}
*/

/*
let socket = new WebSocket(host)
socket.onopen = () => {
  socket.send("palette")
}

//fill palette with grayscale as a placeholder
let palette = new Array(256).fill(0).map((x,i) => [i,i,i])
let livePalette = new Uint8Array(256*3)
let rawData = new Uint8Array(256*256)

let req = (url,callback,responseType="arraybuffer") => {
  let xhr = new XMLHttpRequest()
  //TODO FFFUCK THIS GLOBAL SHIT
  xhr.open("GET", prefix+url, true)
  xhr.responseType = responseType 
  xhr.onload = callback
  xhr.send()
}


let dispMsgs = (msgs, palette, imageData) => {
  for (let i = 0; i < msgs.length; i += 3) {
    let p = msgs[i] + msgs[i+1] * 256
    let color = palette[msgs[i+2]]
    //let prevColorIdx = rawData[p]
    //hist.push([msgs[i],msgs[i+1],msgs[i+2],prevColorIdx])
    rawData[p] = msgs[i+2]
  }
}

socket.onmessage = x => {
  if(typeof x.data !== "string"){
    var arrayBuffer
    var fileReader = new FileReader()
    fileReader.onload = function(data) {
      let frame = new Uint8Array(data.target.result)
      let type = frame[0]
      let msg = new Uint8Array(data.target.result, 1, data.target.result.byteLength-1)
      switch (type) {
        case 0:
          dispMsgs(msg,palette)//,imgData)
          break
        case 1:
          //draw(msg,palette,imgData)
          rawData = msg
          break
        case 2:
          parsePalette(msg)
          break
        case 3:
          //hist = parseHist(msg)
          break
      }
    }
    fileReader.readAsArrayBuffer(x.data);
  } else if (typeof x.data === "string") {
    let data = JSON.parse(x.data)
    if (data.config) {
      config = data.config
    }
    if (data.ts) {
      archiveIndex.push(`snapshot${data.ts}.gz`)
      socket.send('hist')
    }
  }
}

//
module.exports = {
  Client,
}
*/

const ghostLife = {}
ghostLife.Client = Client
