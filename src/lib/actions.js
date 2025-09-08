/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore from './store'
import imageData from './imageData'
import gen from './llm'
import {GIFEncoder, quantize, applyPalette} from 'gifenc'

const get = useStore.getState
const set = useStore.setState
const model = 'gemini-2.5-flash-image-preview'

export const init = () => {
  if (get().didInit) {
    return
  }
  set(state => {
    state.didInit = true
  })
}

export const setBaseImage = b64 => {
  set(state => {
    state.baseImage = b64
  })
}

export const setPersona = persona => {
  set(state => {
    state.persona = persona
  })
}

export const setNarrative = narrative => {
  set(state => {
    state.narrative = narrative
  })
}

export const generateStory = async () => {
  const {baseImage, persona, narrative} = get()
  if (!baseImage || !persona || !narrative) return

  set(state => {
    state.isGeneratingStory = true
    state.storyFrames = [] // Clear previous frames
  })

  const narrativeFrames = narrative
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  const initialFrames = narrativeFrames.map(line => ({
    id: crypto.randomUUID(),
    prompt: line,
    isBusy: true,
    output: null
  }))

  set(state => {
    state.storyFrames = initialFrames
  })

  await Promise.all(
    initialFrames.map(async frame => {
      try {
        const fullPrompt = `Illustrate a scene for a science fiction comic book. The main character is ${persona}. In this panel, the character is in a dramatic moment: "${frame.prompt}". The art style should be vibrant and action-packed, like a classic comic. It is crucial to maintain the character's appearance from the provided image.`

        const result = await gen({
          model,
          prompt: fullPrompt,
          inputFile: baseImage
        })

        imageData.outputs[frame.id] = result

        set(state => {
          const storyFrame = state.storyFrames.find(f => f.id === frame.id)
          if (storyFrame) {
            storyFrame.isBusy = false
            storyFrame.output = result
          }
        })
      } catch (e) {
        console.error(`Failed to generate frame for prompt: "${frame.prompt}"`, e)
        set(state => {
          const storyFrame = state.storyFrames.find(f => f.id === frame.id)
          if (storyFrame) {
            storyFrame.isBusy = false
            // Potentially set an error state on the frame here
          }
        })
      }
    })
  )

  set(state => {
    state.isGeneratingStory = false
  })
}

const loadImage = src => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

const downloadFile = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const processImageToCanvas = async (base64Data, size) => {
  const img = await loadImage(base64Data);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;

  const imgAspect = img.width / img.height;
  
  let drawWidth, drawHeight, drawX, drawY;

  if (imgAspect > 1) { // Landscape image
    drawWidth = size;
    drawHeight = size / imgAspect;
    drawX = 0;
    drawY = (size - drawHeight) / 2;
  } else { // Portrait or square image
    drawHeight = size;
    drawWidth = size * imgAspect;
    drawY = 0;
    drawX = (size - drawWidth) / 2;
  }
  
  // Draw a white background for letterboxing/pillarboxing
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  return ctx.getImageData(0, 0, size, size);
};


export const exportToGif = async () => {
  const {storyFrames} = get()
  const frames = storyFrames.filter(f => f.output)
  if (frames.length === 0) return

  set({isExporting: true})
  try {
    const gifSize = 512
    const gif = GIFEncoder()

    for (const frame of frames) {
      const imageData = await processImageToCanvas(frame.output, gifSize)
      const palette = quantize(imageData.data, 256, {format: 'rgba4444'})
      const index = applyPalette(imageData.data, palette, {format: 'rgba4444'})
      gif.writeFrame(index, gifSize, gifSize, {palette, delay: 1500})
    }

    gif.finish()
    const blob = new Blob([gif.bytes()], {type: 'image/gif'})
    downloadFile(blob, 'narrative-forge.gif')
  } catch (e) {
    console.error('Failed to export GIF', e)
  } finally {
    set({isExporting: false})
  }
}

export const exportToPng = async () => {
  const {storyFrames} = get()
  const frames = storyFrames.filter(f => f.output)
  if (frames.length === 0) return

  set({isExporting: true})
  try {
    await document.fonts.ready

    const images = await Promise.all(
      frames.map(frame => loadImage(frame.output))
    )

    const frameWidth = images[0].width
    const frameHeight = images[0].height
    const numFrames = images.length

    const padding = 20
    const gutter = 15
    const captionHeight = 60
    const panelBorder = 4

    const canvasWidth =
      padding * 2 + numFrames * frameWidth + (numFrames - 1) * gutter
    const canvasHeight = padding * 2 + frameHeight + captionHeight

    const canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = `bold 16px 'Comic Neue', sans-serif`
    ctx.fillStyle = '#000'

    let currentX = padding
    for (let i = 0; i < numFrames; i++) {
      const img = images[i]
      const frameData = frames[i]

      ctx.fillStyle = '#000'
      ctx.fillRect(currentX, padding, frameWidth, frameHeight)
      ctx.drawImage(
        img,
        currentX + panelBorder,
        padding + panelBorder,
        frameWidth - panelBorder * 2,
        frameHeight - panelBorder * 2
      )

      const text = `${i + 1}. ${frameData.prompt}`
      ctx.fillText(
        text,
        currentX + frameWidth / 2,
        padding + frameHeight + 15,
        frameWidth - 10
      )

      currentX += frameWidth + gutter
    }

    canvas.toBlob(blob => {
      downloadFile(blob, 'narrative-forge.png')
    }, 'image/png')
  } catch (e) {
    console.error('Failed to export PNG', e)
  } finally {
    set({isExporting: false})
  }
}

init()