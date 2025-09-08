/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import 'immer'
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {createSelectorFunctions} from 'auto-zustand-selectors-hook'

export default createSelectorFunctions(
  create(
    immer(() => ({
      didInit: false,
      baseImage: null,
      persona: 'A brave space explorer',
      narrative: `Discovers a mysterious artifact.
Outsmarts a lurking alien creature.
Escapes in their spaceship.`,
      storyFrames: [],
      isGeneratingStory: false,
      isExporting: false
    }))
  )
)
