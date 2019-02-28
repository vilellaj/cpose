const cv = require('opencv')
const { createCanvas, loadImage, Image } = require('canvas')
const fs = require('fs')
const uuidv4 = require('uuid/v4')

class Detector {
    async detectHumans(img) {
        const result = {
            count: 0,
            objects: []
        }

        return new Promise(async (resolve, reject) => {
            const buffer = Buffer.from(img.split(',')[1], 'base64')
            cv.readImage(buffer, async (err, im) => {
                if (err) {
                    reject(err)
                }

                im.convertGrayscale()

                const fullbody = await this.detectCascade(im, 'cascades/haarcascade_fullbody.xml', 'full')
                const upperbody = await this.detectCascade(im, 'cascades/haarcascade_upperbody.xml', 'upper')
                const lowerbody = await this.detectCascade(im, 'cascades/haarcascade_lowerbody.xml', 'lower')
                const profileface = await this.detectCascade(im, 'cascades/haarcascade_profileface.xml', 'profile')
                const frontalface = await this.detectCascade(im, 'cascades/haarcascade_frontalface_alt2.xml', 'front')

                result.count += (fullbody.count + upperbody.count + lowerbody.count + profileface.count + frontalface.count)
                result.objects.push(...fullbody.objects)
                result.objects.push(...upperbody.objects)
                result.objects.push(...lowerbody.objects)
                result.objects.push(...profileface.objects)
                result.objects.push(...frontalface.objects)

                resolve(result)
            })
        })
    }

    async detectCascade(img, cascade, tag) {
        return new Promise((resolve, reject) => {
            img.detectObject(cascade, {}, (err, objects) => {

                if (err) {
                    reject(err)
                }

                resolve({
                    count: Array.isArray(objects) ? objects.length : 0,
                    objects: objects.map(x => { return { ...x, tag: tag } })
                })
            })
        })
    }

    async markDetections(base64, w, h, data) {
        return new Promise(async (resolve, reject) => {
            const canvas = createCanvas(w, h)
            const ctx = canvas.getContext('2d')

            const img = new Image()

            img.onload = () => {
                ctx.drawImage(img, 0, 0)
                ctx.font = '26px Impact'
                ctx.fillStyle = "#ffffff"

                if (Array.isArray(data.objects)) {
                    data.objects.forEach(obj => {
                        ctx.rect(obj.x, obj.y, obj.width, obj.height)
                        ctx.fillText(obj.tag, obj.x, obj.y)
                    })
                }
                ctx.strokeStyle = 'rgba(0,255,0,1)'
                ctx.stroke()

                const guid = uuidv4()
                const out = fs.createWriteStream(`${__dirname}/results/${guid}.jpeg`)
                const stream = canvas.createJPEGStream()
                stream.pipe(out)
                out.on('finish', () => console.log('The JPEG file was created.'))

                resolve(true)
            }

            img.src = base64
        })
    }
}

module.exports = Detector