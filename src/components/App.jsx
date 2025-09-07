/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {useRef, useState} from 'react'
import c from 'clsx'
import {
  setBaseImage,
  setPersona,
  setNarrative,
  generateStory
} from '../lib/actions'
import useStore from '../lib/store'
import imageData from '../lib/imageData'

const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')

export default function App() {
  const baseImage = useStore.use.baseImage()
  const persona = useStore.use.persona()
  const narrative = useStore.use.narrative()
  const storyFrames = useStore.use.storyFrames()
  const isGeneratingStory = useStore.use.isGeneratingStory()

  const [videoActive, setVideoActive] = useState(false)
  const [didInitVideo, setDidInitVideo] = useState(false)
  const [didJustSnap, setDidJustSnap] = useState(false)
  const videoRef = useRef(null)

  const startVideo = async () => {
    setDidInitVideo(true)
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {width: {ideal: 1920}, height: {ideal: 1080}},
      audio: false,
      facingMode: {ideal: 'user'}
    })
    setVideoActive(true)
    videoRef.current.srcObject = stream

    const {width, height} = stream.getVideoTracks()[0].getSettings()
    const squareSize = Math.min(width, height)
    canvas.width = squareSize
    canvas.height = squareSize
  }

  const captureBaseImage = () => {
    const video = videoRef.current
    const {videoWidth, videoHeight} = video
    const squareSize = canvas.width
    const sourceSize = Math.min(videoWidth, videoHeight)
    const sourceX = (videoWidth - sourceSize) / 2
    const sourceY = (videoHeight - sourceSize) / 2

    ctx.clearRect(0, 0, squareSize, squareSize)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(
      video,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      -squareSize,
      0,
      squareSize,
      squareSize
    )
    setBaseImage(canvas.toDataURL('image/jpeg'))
    setDidJustSnap(true)
    setTimeout(() => setDidJustSnap(false), 1000)
  }

  const renderWebcamView = () => (
    <div className="video">
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        disablePictureInPicture="true"
      />
      {didJustSnap && <div className="flash" />}
      {!videoActive && (
        <button className="startButton" onClick={startVideo}>
          <h1>🎭 Narrative Forge</h1>
          <p>
            {didInitVideo
              ? 'One sec…'
              : 'Tap anywhere to start your webcam.'}
          </p>
        </button>
      )}
      {videoActive && (
        <div className="videoControls">
          <p
            style={{
              color: 'white',
              textShadow: '2px 2px 0 #000',
              marginBottom: '10px',
              fontFamily: "'Bangers', cursive",
              fontSize: '24px',
              letterSpacing: '1px'
            }}
          >
            Step 1: Capture Your Identity
          </p>
          <button onClick={captureBaseImage} className="shutter">
            <span className="icon">camera</span>
          </button>
        </div>
      )}
    </div>
  )

  const renderStoryBuilder = () => (
    <div className="video story-builder">
      <div className="form-section">
        <div className="identity-section">
          <img src={baseImage} alt="Base identity" />
          <button className="button" onClick={() => setBaseImage(null)}>
            <span className="icon">refresh</span> Retake
          </button>
        </div>
        <div className="narrative-section">
          <h2>Step 2: Forge Your Narrative</h2>
          <label>Persona</label>
          <input
            type="text"
            value={persona}
            onChange={e => setPersona(e.target.value)}
            placeholder="e.g., A brave space explorer"
          />
          <label>Story (each line is a new frame)</label>
          <textarea
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
            placeholder="e.g., Discovers a mysterious artifact."
            rows={4}
          />
          <button
            className="button generate-button"
            onClick={generateStory}
            disabled={isGeneratingStory}
          >
            <span className="icon">auto_awesome</span>
            {isGeneratingStory ? 'Generating...' : 'Generate Story'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <main>
      {!baseImage ? renderWebcamView() : renderStoryBuilder()}

      <div className="results">
        <ul>
          {storyFrames.length > 0
            ? storyFrames.map(({id, isBusy, output, prompt}) => (
                <li className={c({isBusy})} key={id} title={prompt}>
                  <div className="photo">
                    <img
                      src={isBusy ? baseImage : output}
                      draggable={false}
                      alt={prompt}
                    />
                  </div>
                </li>
              ))
            : videoActive && (
                <li className="empty" key="empty">
                  Your story board awaits...
                </li>
              )}
        </ul>
      </div>
    </main>
  )
}