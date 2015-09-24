var https = require('https')
var fs = require('fs')
var url = process.argv[2]

// TODO: This is probably bad
var exitCodes = [
  'spotify-cover-fetch exited successfully',
  'You need to supply a Spotify URL',
  'The supplied string is not a valid Spotify URL'
]

process.on('exit', (code) => {
  console.log(exitCodes[code])
})

function getImageData (json) {
  var images
  var name
  if (json.images) {
    images = json.images
    name = json.name
  } else {
    images = json.album.images
    name = json.album.name
  }
  return { name: name,
           url: images.reduce((x, y) => {
             return x.height * x.width > y.height * y.width ? x : y
           }).url }
}

function downloadImage (imageUrl, imageName) {
  var outFile = process.argv[3] || imageName + '.jpg'
  var coverFile = fs.createWriteStream(outFile)
  https.get(imageUrl, (res) => {
    res.pipe(coverFile)
  })
}

function getJson (res) {
  var allData

  res.on('data', (data) => {
    if (!allData) allData = data
    else allData += data
  })

  res.on('end', () => {
    var json = JSON.parse(allData)
    var image = getImageData(json)
    downloadImage(image.url, image.name)
  })
}

// Checks if the supplied string is a valid Spotify URL and returns a
// corresponding API URL or false.
//
// Valid formats:
// Spotify's internal URLs: spotify:artist:1vCWHaC5f2uS3yhpwWbIA6
// Spotify's web URLs: https://open.spotify.com/artist/1vCWHaC5f2uS3yhpwWbIA6
function getApiUrl (str) {
  if (/^(?:https?\:\/\/open.)?spotify(?::|.com\/)(?:artist|album|track)[:/][A-Za-z0-9]{22}$/.test(str)) {
    return str.replace(/^.*(artist|album|track)[:/]([A-Za-z0-9]{22})$/, (p0, p1, p2) => {
      return `https://api.spotify.com/v1/${p1}s/${p2}`
    })
  } else {
    return false
  }
}

// Exit with error message if no command-line arguments are supplied
if (!url) process.exit(1)

var apiUrl = getApiUrl(url)

// Exit with error message if the command-line arguemnt
// is not a valid Spotify URL
if (!apiUrl) process.exit(2)

// Commence callback hell
https.get(apiUrl, getJson)
