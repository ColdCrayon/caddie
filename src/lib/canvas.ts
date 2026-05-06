export async function extractFrames(
  videoBlob: Blob,
  count = 5
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(videoBlob)
    video.src = url
    video.muted = true
    video.playsInline = true

    video.addEventListener('loadedmetadata', () => {
      const duration = video.duration
      const canvas = document.createElement('canvas')
      canvas.width = 640
      canvas.height = 360
      const ctx = canvas.getContext('2d')!
      const frames: string[] = []
      let captured = 0

      const captureAt = (time: number) => {
        video.currentTime = time
      }

      video.addEventListener('seeked', () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        frames.push(canvas.toDataURL('image/jpeg', 0.7).split(',')[1])
        captured++
        if (captured < count) {
          captureAt((captured / (count - 1)) * duration)
        } else {
          URL.revokeObjectURL(url)
          resolve(frames)
        }
      })

      captureAt(0)
    })

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Video load failed'))
    })
  })
}

export function extractThumbnail(videoBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(videoBlob)
    video.src = url
    video.muted = true
    video.playsInline = true

    video.addEventListener('loadedmetadata', () => {
      video.currentTime = 0
    })

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 180
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const thumbnail = canvas.toDataURL('image/jpeg', 0.6)
      URL.revokeObjectURL(url)
      resolve(thumbnail)
    })

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('Thumbnail extraction failed'))
    })
  })
}
