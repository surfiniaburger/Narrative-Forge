/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore from './store'
import imageData from './imageData'
import {genImage, genText} from './llm'
import {GIFEncoder, quantize, applyPalette} from 'gifenc'
import {Type} from '@google/genai'
import {ElevenLabsClient} from '@elevenlabs/elevenlabs-js'
import {Muxer, ArrayBufferTarget} from 'mp4-muxer'

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

        const result = await genImage({
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
  const img = await loadImage(base64Data)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = size
  canvas.height = size

  const imgAspect = img.width / img.height

  let drawWidth, drawHeight, drawX, drawY

  if (imgAspect > 1) {
    // Landscape image
    drawWidth = size
    drawHeight = size / imgAspect
    drawX = 0
    drawY = (size - drawHeight) / 2
  } else {
    // Portrait or square image
    drawHeight = size
    drawWidth = size * imgAspect
    drawY = 0
    drawX = (size - drawWidth) / 2
  }

  // Draw a white background for letterboxing/pillarboxing
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

  return ctx.getImageData(0, 0, size, size)
}

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

export const exportToVideo = async () => {
  const {storyFrames} = get()
  const frames = storyFrames.filter(f => f.output)
  if (frames.length === 0) return

  set({isExportingVideo: true})
  try {
    let elevenLabsApiKey = get().elevenLabsApiKey
    if (!elevenLabsApiKey) {
      elevenLabsApiKey = prompt(
        'Please enter your ElevenLabs API Key to export video:'
      )
      if (!elevenLabsApiKey) {
        // User cancelled or entered nothing
        set({isExportingVideo: false})
        return
      }
      set({elevenLabsApiKey}) // Save for the session
    }

    // Step 1: Generate script from frames
    console.log('Generating script...')
    const scriptPrompt =
      "You are an expert comic book analyst. Read the following comic panels and extract all dialogue, narration, and sound effects. For each piece of text, identify which panel it belongs to and who is speaking (e.g., 'Hero', 'Alien', 'Narrator', 'Sound Effect'). Structure your output as a JSON array."
    const imageParts = frames.map(frame => ({
      inlineData: {
        data: frame.output.split(',')[1],
        mimeType: 'image/png'
      }
    }))

    const scriptResponse = await genText({
      model: 'gemini-2.5-flash',
      contents: {parts: [{text: scriptPrompt}, ...imageParts]},
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description:
            'An array of script entries, one for each piece of dialogue, narration or sound effect in the comic.',
          items: {
            type: Type.OBJECT,
            properties: {
              panel: {
                type: Type.INTEGER,
                description:
                  'The panel number (1-based index) where this line appears.'
              },
              speaker: {
                type: Type.STRING,
                description:
                  "The character speaking the line (e.g., 'Hero', 'Alien', 'Narrator', 'Sound Effect')."
              },
              line: {
                type: Type.STRING,
                description: 'The dialogue, narration, or sound effect text.'
              }
            }
          }
        }
      }
    })

    const script = JSON.parse(scriptResponse)
    console.log('Script generated:', script)

    // Step 2: Generate audio from script
    console.log('Generating audio...')
    const elevenlabs = new ElevenLabsClient({
      apiKey: elevenLabsApiKey
    })
    const voiceMap = {
      default: 'mgpcWiEXIWuENJCy8ADX',
      narrator: 'mgpcWiEXIWuENJCy8ADX',
      hero: 'G17SuINrv2H9FC6nvetn',
      alien: 'alFofuDn3cOwyoz1i44T'
    }

    const audioClips = await Promise.all(
      script.map(async item => {
        const voiceKey =
          Object.keys(voiceMap).find(key =>
            item.speaker.toLowerCase().includes(key)
          ) || 'default'
        const voiceId = voiceMap[voiceKey]

        const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
          text: item.line
        })
        const chunks = []
        for await (const chunk of audioStream) {
          chunks.push(chunk)
        }
        const blob = new Blob(chunks, {type: 'audio/mpeg'})
        return {panel: item.panel, blob}
      })
    )
    console.log('Audio generated.')

    // Step 3: Mux video and audio
    console.log('Muxing video...')
    const videoSize = 720
    const audioCtx = new AudioContext({sampleRate: 44100})
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: {codec: 'avc', width: videoSize, height: videoSize},
      audio: {codec: 'aac', sampleRate: 44100, numberOfChannels: 1},
      fastStart: 'fragmented'
    })

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: e => console.error(e)
    })
    videoEncoder.configure({
      codec: 'avc1.42001f',
      width: videoSize,
      height: videoSize,
      framerate: 30
    })

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: e => console.error(e)
    })
    audioEncoder.configure({
      codec: 'mp4a.40.2',
      sampleRate: 44100,
      numberOfChannels: 1,
      bitrate: 128000
    })

    const images = await Promise.all(frames.map(f => loadImage(f.output)))
    const canvas = document.createElement('canvas')
    canvas.width = videoSize
    canvas.height = videoSize
    const ctx = canvas.getContext('2d')

    for (let i = 0; i < frames.length; i++) {
      const panelNumber = i + 1
      const panelClips = audioClips.filter(c => c.panel === panelNumber)

      // Process audio first to get duration
      let totalDurationMicroseconds = 2_000_000 // Default 2s duration
      if (panelClips.length > 0) {
        let totalDuration = 0
        for (const clip of panelClips) {
          const arrayBuffer = await clip.blob.arrayBuffer()
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
          totalDuration += audioBuffer.duration
          const pcm = audioBuffer.getChannelData(0)
          const audioData = new AudioData({
            format: 'f32',
            sampleRate: 44100,
            numberOfFrames: pcm.length,
            numberOfChannels: 1,
            timestamp: 0,
            data: pcm
          })
          audioEncoder.encode(audioData)
        }
        totalDurationMicroseconds = Math.round(totalDuration * 1_000_000)
      }

      // Process video frame
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, videoSize, videoSize)
      ctx.drawImage(images[i], 0, 0, videoSize, videoSize)

      const videoFrame = new VideoFrame(canvas, {
        timestamp: (i * 3000 + 1) * 1000,
        duration: totalDurationMicroseconds
      })
      videoEncoder.encode(videoFrame, {
        keyFrame: true
      })
      videoFrame.close()
    }

    await videoEncoder.flush()
    await audioEncoder.flush()
    muxer.finalize()

    const {buffer} = muxer.target
    downloadFile(new Blob([buffer]), 'narrative-forge-story.mp4')
    console.log('Video export complete.')
  } catch (e) {
    console.error('Failed to export Video', e)
    alert(`Video export failed: ${e.message}`)
  } finally {
    set({isExportingVideo: false})
  }
}

init()