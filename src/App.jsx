import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_FILTER_SETTINGS,
  FILTER_CONTROLS,
  FILTER_PRESETS,
  buildFilterString,
  mergeFilterSettings
} from './filters'

const QUALITY_MODES = [
  {
    id: 'balanced',
    label: '平衡',
    constraints: {
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  },
  {
    id: 'detail',
    label: '高畫質',
    constraints: {
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  },
  {
    id: 'portrait',
    label: '人像',
    constraints: {
      width: { ideal: 1080 },
      height: { ideal: 1440 }
    }
  }
]

function stopStream(stream) {
  if (!stream) {
    return
  }

  stream.getTracks().forEach((track) => {
    track.stop()
  })
}

function getCameraConstraints({ cameraMode, deviceId, qualityId }) {
  const quality = QUALITY_MODES.find((item) => item.id === qualityId) ?? QUALITY_MODES[0]
  const video = {
    ...quality.constraints
  }

  if (deviceId) {
    video.deviceId = { exact: deviceId }
  } else {
    video.facingMode = cameraMode === 'front' ? 'user' : { ideal: 'environment' }
  }

  return {
    audio: false,
    video
  }
}

function detectTorch(track) {
  const capabilities = typeof track?.getCapabilities === 'function' ? track.getCapabilities() : {}
  return Boolean(capabilities?.torch)
}

async function setTorch(track, enabled) {
  if (!track || !detectTorch(track)) {
    return false
  }

  await track.applyConstraints({
    advanced: [{ torch: enabled }]
  })

  return true
}

export default function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [devices, setDevices] = useState([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [cameraMode, setCameraMode] = useState('front')
  const [qualityId, setQualityId] = useState('balanced')
  const [activePresetId, setActivePresetId] = useState('clean')
  const [filterSettings, setFilterSettings] = useState(DEFAULT_FILTER_SETTINGS)
  const [status, setStatus] = useState('準備請求相機權限…')
  const [error, setError] = useState('')
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [isBooting, setIsBooting] = useState(true)
  const [lastCapture, setLastCapture] = useState('')

  const activePreset = FILTER_PRESETS.find((preset) => preset.id === activePresetId) ?? FILTER_PRESETS[0]
  const filterStyle = buildFilterString(filterSettings)

  useEffect(() => {
    let cancelled = false

    async function bootCamera() {
      setIsBooting(true)
      setError('')
      setStatus('正在啟動相機…')

      try {
        const nextStream = await navigator.mediaDevices.getUserMedia(
          getCameraConstraints({
            cameraMode,
            deviceId: selectedDeviceId,
            qualityId
          })
        )

        if (cancelled) {
          stopStream(nextStream)
          return
        }

        const [videoTrack] = nextStream.getVideoTracks()
        const nextTorchSupported = detectTorch(videoTrack)

        stopStream(streamRef.current)
        streamRef.current = nextStream
        setStream(nextStream)
        setTorchSupported(nextTorchSupported)
        setTorchEnabled(false)
        setStatus('相機已就緒')

        if (videoRef.current) {
          videoRef.current.srcObject = nextStream
        }

        const mediaDevices = await navigator.mediaDevices.enumerateDevices()
        if (!cancelled) {
          const videoInputs = mediaDevices.filter((device) => device.kind === 'videoinput')
          setDevices(videoInputs)
        }
      } catch (caughtError) {
        if (cancelled) {
          return
        }

        setError(caughtError instanceof Error ? caughtError.message : '無法取得相機權限。')
        setStatus('相機啟動失敗')
      } finally {
        if (!cancelled) {
          setIsBooting(false)
        }
      }
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('此瀏覽器不支援相機 API。請使用最新版 Chrome 或 Safari。')
      setStatus('裝置不支援')
      setIsBooting(false)
      return undefined
    }

    bootCamera()

    return () => {
      cancelled = true
    }
  }, [cameraMode, qualityId, selectedDeviceId])

  useEffect(() => {
    return () => {
      stopStream(streamRef.current)
    }
  }, [])

  useEffect(() => {
    const presetSettings = mergeFilterSettings(activePreset.settings)
    setFilterSettings(presetSettings)
  }, [activePreset])

  useEffect(() => {
    async function syncVideoSource() {
      if (!videoRef.current || !stream) {
        return
      }

      videoRef.current.srcObject = stream

      try {
        await videoRef.current.play()
      } catch {
        setStatus('等待使用者互動以播放預覽')
      }
    }

    syncVideoSource()
  }, [stream])

  async function handleToggleTorch() {
    const track = stream?.getVideoTracks()[0]
    if (!track) {
      return
    }

    try {
      const nextEnabled = !torchEnabled
      const changed = await setTorch(track, nextEnabled)
      if (changed) {
        setTorchEnabled(nextEnabled)
        setStatus(nextEnabled ? '手電筒已開啟' : '手電筒已關閉')
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '無法切換手電筒。')
    }
  }

  function handlePresetSelect(presetId) {
    setActivePresetId(presetId)
  }

  function handleFilterChange(key, value) {
    setActivePresetId('clean')
    setFilterSettings((current) => ({
      ...current,
      [key]: Number(value)
    }))
  }

  function handleSwitchCamera(mode) {
    setSelectedDeviceId('')
    setCameraMode(mode)
  }

  function handleCapture() {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setError('目前尚無可擷取的影像。')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (!context) {
      setError('無法建立畫布內容。')
      return
    }

    context.filter = filterStyle
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setLastCapture(dataUrl)

    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `filter-camera-${Date.now()}.jpg`
    link.click()

    setStatus('已拍攝並下載照片')
  }

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">PWA FILTER CAMERA</p>
          <h1>手機可安裝的 React 濾鏡相機</h1>
          <p className="hero-copy">
            以 GitHub Pages 為部署目標，提供大量濾鏡、前後鏡頭切換、手電筒控制與即拍即存。
          </p>
        </div>
        <div className="status-card">
          <span className="status-pill">{status}</span>
          <p>{torchSupported ? '目前裝置支援手電筒切換。' : '目前裝置可能不支援手電筒控制。'}</p>
          <p>濾鏡數量：{FILTER_PRESETS.length} 組預設 + 8 組手動滑桿</p>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="camera-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Live Preview</p>
              <h2>鏡頭預覽</h2>
            </div>
            <div className="camera-switches" role="tablist" aria-label="Camera mode selection">
              <button
                type="button"
                className={cameraMode === 'front' ? 'toggle active' : 'toggle'}
                onClick={() => handleSwitchCamera('front')}
              >
                前鏡頭
              </button>
              <button
                type="button"
                className={cameraMode === 'rear' ? 'toggle active' : 'toggle'}
                onClick={() => handleSwitchCamera('rear')}
              >
                後鏡頭
              </button>
            </div>
          </div>

          <div className="preview-shell">
            <video
              ref={videoRef}
              className="camera-feed"
              playsInline
              muted
              autoPlay
              style={{ filter: filterStyle }}
            />
            <div className="preview-overlay">
              <span>{activePreset.name}</span>
              <span>{activePreset.description}</span>
            </div>
            {isBooting ? <div className="loading-scrim">啟動鏡頭中…</div> : null}
          </div>

          <div className="control-grid">
            <label className="field">
              <span>鏡頭裝置</span>
              <select value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
                <option value="">依前後鏡頭自動選擇</option>
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>畫質模式</span>
              <select value={qualityId} onChange={(event) => setQualityId(event.target.value)}>
                {QUALITY_MODES.map((quality) => (
                  <option key={quality.id} value={quality.id}>
                    {quality.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="action-row">
            <button type="button" className="capture-button" onClick={handleCapture}>
              拍照並下載
            </button>
            <button
              type="button"
              className={torchEnabled ? 'secondary-button enabled' : 'secondary-button'}
              onClick={handleToggleTorch}
              disabled={!torchSupported}
            >
              {torchEnabled ? '關閉手電筒' : '開啟手電筒'}
            </button>
          </div>

          <canvas ref={canvasRef} className="hidden-canvas" />

          {error ? <p className="error-banner">{error}</p> : null}

          {lastCapture ? (
            <div className="capture-card">
              <div className="panel-heading compact">
                <div>
                  <p className="panel-kicker">Latest Capture</p>
                  <h2>最近拍攝</h2>
                </div>
              </div>
              <img src={lastCapture} alt="最近拍攝的濾鏡照片" className="capture-preview" />
            </div>
          ) : null}
        </section>

        <section className="sidebar-panel">
          <div className="panel-heading compact">
            <div>
              <p className="panel-kicker">Filter Library</p>
              <h2>大量濾鏡</h2>
            </div>
          </div>
          <div className="preset-grid">
            {FILTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={preset.id === activePresetId ? 'preset-card active' : 'preset-card'}
                onClick={() => handlePresetSelect(preset.id)}
              >
                <strong>{preset.name}</strong>
                <span>{preset.description}</span>
              </button>
            ))}
          </div>

          <div className="panel-heading compact sliders-heading">
            <div>
              <p className="panel-kicker">Fine Tuning</p>
              <h2>手動微調</h2>
            </div>
          </div>

          <div className="slider-list">
            {FILTER_CONTROLS.map((control) => (
              <label key={control.key} className="slider-field">
                <div>
                  <span>{control.label}</span>
                  <strong>
                    {filterSettings[control.key]}
                    {control.unit}
                  </strong>
                </div>
                <input
                  type="range"
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={filterSettings[control.key]}
                  onChange={(event) => handleFilterChange(control.key, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
