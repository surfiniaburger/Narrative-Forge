/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
  Modality,
  HarmCategory,
  HarmBlockThreshold
} from '@google/genai'
import {limitFunction} from 'p-limit'

const timeoutMs = 123_333
const maxRetries = 5
const baseDelay = 1_233
const ai = new GoogleGenAI({apiKey: process.env.API_KEY})

const handleRetry = async (attempt, error, signal) => {
  if (signal?.aborted || error.name === 'AbortError') {
    return false // Abort
  }

  if (attempt === maxRetries - 1) {
    throw error // Max retries reached
  }

  const delay = baseDelay * 2 ** attempt
  await new Promise(res => setTimeout(res, delay))
  console.warn(`Attempt ${attempt + 1} failed, retrying after ${delay}ms...`)
  return true // Continue retrying
}

const imageGenLimiter = limitFunction(
  async ({model, prompt, inputFile, signal}) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeoutMs)
        )

        const parts = []
        if (inputFile) {
          parts.push({
            inlineData: {
              data: inputFile.split(',')[1],
              mimeType: 'image/jpeg'
            }
          })
        }
        parts.push({text: prompt})

        const modelPromise = ai.models.generateContent({
          model,
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE]
          },
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
            },
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
            }
          ],
          contents: {parts}
        })

        const response = await Promise.race([modelPromise, timeoutPromise])

        if (!response.candidates || response.candidates.length === 0) {
          throw new Error('No candidates in response')
        }

        if (!response.candidates[0].content) {
          const {finishReason, safetyRatings} = response.candidates[0]
          console.error('Content blocked or unavailable.', {
            finishReason,
            safetyRatings
          })
          throw new Error(
            `Generation failed. Reason: ${finishReason || 'Unknown'}`
          )
        }

        const inlineDataPart = response.candidates[0].content.parts.find(
          p => p.inlineData
        )
        if (!inlineDataPart) {
          throw new Error('No inline data found in response')
        }

        return 'data:image/png;base64,' + inlineDataPart.inlineData.data
      } catch (error) {
        if (!(await handleRetry(attempt, error, signal))) return
      }
    }
  },
  {concurrency: 4}
)

const textGenLimiter = limitFunction(
  async ({model, contents, config, signal}) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeoutMs)
        )

        const modelPromise = ai.models.generateContent({
          model,
          contents,
          config
        })

        const response = await Promise.race([modelPromise, timeoutPromise])

        if (!response.candidates || response.candidates.length === 0) {
          throw new Error('No candidates in response')
        }

        if (!response.candidates[0].content) {
          const {finishReason, safetyRatings} = response.candidates[0]
          console.error('Content blocked or unavailable.', {
            finishReason,
            safetyRatings
          })
          throw new Error(
            `Generation failed. Reason: ${finishReason || 'Unknown'}`
          )
        }

        return response.text.trim()
      } catch (error) {
        if (!(await handleRetry(attempt, error, signal))) return
      }
    }
  },
  {concurrency: 4}
)

export const genImage = imageGenLimiter
export const genText = textGenLimiter
