/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore from './store'
import imageData from './imageData'
import gen from './llm'

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

init()