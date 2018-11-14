let options = {
  hostname: 'ghost.life',
  secure: true
}
let client = new ghostLife.Client(options)
let set, get
client.onopen = () => {
  get = client.get
  set = client.set
  console.log(client.palette)
}

client.open()
