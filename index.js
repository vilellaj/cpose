const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const bodyParser = require('body-parser')
const port = 8080

const Detector = require('./detector')
const detector = new Detector()

const handleImage = async (img) => {
    let result = await detector.detectFaces(img)
    io.emit('faces', result)
}

app.use(bodyParser.json({limit: '50mb'}))

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

app.post('/detect', async (req, res) => {
    const image = req.body.image
    const w = req.body.w
    const h = req.body.h

    const result = await detector.detectHumans(image)
    const finalImage = await detector.markDetections(image, w, h, result)

    res.send({ result: finalImage })
})

io.on('connection', (socket) => {
    console.log('a user connected')
    socket.on('disconnect', () => {
        console.log('user disconnected')
    })

    socket.on('handshake', (msg) => {
        console.log('message: ' + msg)
    })

    socket.on('image', handleImage)
})

http.listen(port, () => {
    console.log(`listening on *:${port}`)
})