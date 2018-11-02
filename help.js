let hcss = {
  title:`font-weight: bold; font-size: 24px`,
  code:`font-family: monospace; color: #C25; background: #EEE; display: inline-block; border-radius: 3px; border: 1px solid #CCC; padding: 2px; line-height: 2em`,
  text:`font-family: sans-serif; line-height: 2em`,
  bold:`font-weight: bold`,
  clear:``
}
let help = `
  %cJS API Primer%c

  all indicies are 8bit integers unless otherwise noted
  %cset(x,y,c)%c sets a pixel [x,y] to color c where c is an index of palette
  %cget(x,y)%c to get the color index at x,y
  %cpalette%c is an array of colors sorted ascending by average rgb brightness
  %crawData%c is a Uint8Array of the image color indicies in row major order 
  %csync()%c forces canvas to sync from server
`
let hstyles = "title,text,code,text,code,text,code,text,code,text,code,text".split(',')
console.log(help,...hstyles.map(s => hcss[s]))
