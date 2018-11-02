let sum = (a,b)=>a+b

let hitLive =  true
let dev = hitLive?false:config.dev 
let host = dev?"ws://localhost:8080":"wss://ghost.life"
let prefix = dev?"":"https://ghost.life/"
console.log("connecting to server @ "+host)
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

//this loads a *.act file out of photoshop and dumps it into the palette
let parsePalette = (rawArray, isHistory) => {
  //fuck i need to think about this and make it not bad
  //WHYYY DID I WRITE THIS
  //this updates the global palette
  rawArray.forEach((e,i) => palette[(i/3)|0][i%3]=e)

  if (!isHistory) {
    livePalette = rawArray
    sync()
    //socket.send('hist')
  } 
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

let sync = () => socket.send("fetch")

let set = (x,y,c) => {
  let offset = calcOffset(x,y)
  //rawData[offset] = c
  buffer.push([x,y,c])
}

let calcOffset = (x,y) => x+256*y

let get = (x,y) => {
  let offset = calcOffset(x,y)
  return rawData[offset]
}

let setMany = (msgs) => {
  let msg = []
  msgs.forEach(m => msg.push.apply(msg, m))
  socket.send(new Uint8ClampedArray(msg))
}

let buffer = []
setInterval(() => {
  if (buffer.length > 0) {
    setMany(buffer)
    buffer = []
  }
}, 16)
