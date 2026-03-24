import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_FILTER_SETTINGS,
  FILTER_CONTROLS,
  FILTER_PRESETS,
  buildFilterString,
  mergeFilterSettings
} from './filters'

const PERMISSION_STATE = {
  idle: 'idle',
  requesting: 'requesting',
  granted: 'granted',
  denied: 'denied',
  unsupported: 'unsupported'
}

const ZOOM_RANGE = {
  min: 1,
  max: 4,
  step: 0.1
}

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

function getCameraErrorMessage(caughtError) {
  if (!(caughtError instanceof Error)) {
    return '無法取得相機存取權。請確認瀏覽器已允許相機權限後再試一次。'
  }

  if (caughtError.name === 'NotAllowedError' || caughtError.name === 'PermissionDeniedError') {
    return '瀏覽器拒絕了相機權限。請點擊「啟動相機」，並在權限提示中選擇允許；若先前已拒絕，請到瀏覽器網站設定把相機改成允許後再重試。'
  }

  if (caughtError.name === 'NotFoundError' || caughtError.name === 'DevicesNotFoundError') {
    return '找不到可用的相機裝置。請確認手機或電腦有可用鏡頭。'
  }

  if (caughtError.name === 'NotReadableError' || caughtError.name === 'TrackStartError') {
    return '相機目前被其他 App 或分頁占用。請關閉其他正在使用鏡頭的程式後再試一次。'
  }

  if (caughtError.name === 'OverconstrainedError') {
    return '目前裝置不支援這組鏡頭或畫質條件。請改用其他鏡頭或畫質模式後重試。'
  }

  if (caughtError.name === 'SecurityError') {
    return '目前環境無法安全存取相機。請確認你是從 https 的 GitHub Pages 網址開啟，而不是本機檔案。'
  }

  return caughtError.message || '無法取得相機存取權。請稍後重試。'
}

function detectPlatform() {
  const userAgent = navigator.userAgent.toLowerCase()

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios'
  }

  if (userAgent.includes('android')) {
    return 'android'
  }

  return 'desktop'
}

function detectStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function getPermissionGuide({ platform, isStandalone, permissionState }) {
  if (permissionState === PERMISSION_STATE.granted) {
    return ['相機權限已允許，之後可直接重新開啟此 PWA 使用鏡頭。']
  }

  if (platform === 'ios') {
    return isStandalone
      ? [
          'iPhone 主畫面啟動的 PWA 第一次仍會跳出相機權限提示，請選擇允許。',
          '若先前拒絕，請到 iPhone 的「設定 -> Safari -> 相機」或網站權限中改成允許。',
          '若仍無法使用，請刪除主畫面捷徑後重新加入，或回到 Safari 先授權一次。'
        ]
      : [
          '請先在 Safari 中點擊啟動相機並允許權限。',
          '確認可用後，再使用「加入主畫面」安裝成 PWA，之後會沿用已授權狀態。',
          '若曾拒絕，請到 iPhone 設定中的 Safari 相機權限改成允許。'
        ]
  }

  if (platform === 'android') {
    return isStandalone
      ? [
          'Android 安裝後的 PWA 會以獨立 App 形式要求相機權限，請選擇允許。',
          '若先前拒絕，請到「App 資訊 -> 權限 -> 相機」重新開啟。',
          '部分瀏覽器會把權限綁在 Chrome 或 Edge，本頁重新啟動相機即可再次請求。'
        ]
      : [
          '請在 Chrome 或 Edge 中點擊啟動相機並允許權限。',
          '安裝成 PWA 後，若看不到權限提示，請到系統的 App 權限頁重新開啟相機。',
          '如果鏡頭被別的 App 占用，先關掉其他相機 App 再重試。'
        ]
  }

  return [
    '請點擊啟動相機並允許瀏覽器的相機提示。',
    '若先前拒絕，請到目前網站的權限設定把相機改成允許。'
  ]
}

function drawZoomedFrame(context, video, canvas, zoomLevel) {
  const sourceWidth = video.videoWidth / zoomLevel
  const sourceHeight = video.videoHeight / zoomLevel
  const sourceX = (video.videoWidth - sourceWidth) / 2
  const sourceY = (video.videoHeight - sourceHeight) / 2

  context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
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
  const [status, setStatus] = useState('點擊下方按鈕以啟動相機')
  const [error, setError] = useState('')
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [isBooting, setIsBooting] = useState(false)
  const [lastCapture, setLastCapture] = useState('')
  const [permissionState, setPermissionState] = useState(PERMISSION_STATE.idle)
  const [cameraRequestVersion, setCameraRequestVersion] = useState(0)
  const [permissionHintState, setPermissionHintState] = useState('unknown')
  const [platform, setPlatform] = useState('desktop')
  const [isStandalone, setIsStandalone] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  const activePreset = FILTER_PRESETS.find((preset) => preset.id === activePresetId) ?? FILTER_PRESETS[0]
  const filterStyle = buildFilterString(filterSettings)
  const permissionGuide = getPermissionGuide({
    platform,
    isStandalone,
    permissionState: permissionHintState === 'denied' ? PERMISSION_STATE.denied : permissionState
  })

  useEffect(() => {
    setPlatform(detectPlatform())
    setIsStandalone(detectStandaloneMode())
  }, [])

  useEffect(() => {
    if (!navigator.permissions?.query) {
      return undefined
    }

    let mounted = true
    let permissionStatus

    async function monitorPermission() {
      try {
        permissionStatus = await navigator.permissions.query({ name: 'camera' })
        if (!mounted) {
          return
        }

        setPermissionHintState(permissionStatus.state)
        permissionStatus.onchange = () => {
          setPermissionHintState(permissionStatus.state)
        }
      } catch {
        setPermissionHintState('unknown')
      }
    }

    monitorPermission()

    return () => {
      mounted = false
      if (permissionStatus) {
        permissionStatus.onchange = null
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootCamera() {
      setIsBooting(true)
      setPermissionState(PERMISSION_STATE.requesting)
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
        setPermissionState(PERMISSION_STATE.granted)
        setPermissionHintState('granted')
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

        if (caughtError instanceof Error) {
          if (caughtError.name === 'NotAllowedError' || caughtError.name === 'PermissionDeniedError') {
            setPermissionState(PERMISSION_STATE.denied)
            setPermissionHintState('denied')
            setStatus('相機權限遭拒')
          } else {
            setPermissionState(PERMISSION_STATE.idle)
            setStatus('相機啟動失敗')
          }
        } else {
          setPermissionState(PERMISSION_STATE.idle)
          setStatus('相機啟動失敗')
        }

        setError(getCameraErrorMessage(caughtError))
      } finally {
        if (!cancelled) {
          setIsBooting(false)
        }
      }
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('此瀏覽器不支援相機 API。請使用最新版 Chrome 或 Safari。')
      setStatus('裝置不支援')
      setPermissionState(PERMISSION_STATE.unsupported)
      setIsBooting(false)
      return undefined
    }

    if (cameraRequestVersion === 0) {
      return undefined
    }

    bootCamera()

    return () => {
      cancelled = true
    }
  }, [cameraMode, qualityId, selectedDeviceId, cameraRequestVersion])

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

  function handleStartCamera() {
    setCameraRequestVersion((current) => current + 1)
  }

  function handleZoomChange(value) {
    setZoomLevel(Number(value))
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
    drawZoomedFrame(context, video, canvas, zoomLevel)

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
              style={{ filter: filterStyle, transform: `scale(${zoomLevel})` }}
            />
            {!stream && !isBooting ? (
              <div className="permission-overlay">
                <p className="permission-title">
                  {permissionState === PERMISSION_STATE.denied ? '需要重新授權相機' : '尚未啟動相機'}
                </p>
                <p className="permission-copy">
                  {permissionState === PERMISSION_STATE.denied
                    ? '請重新點擊啟動，並在瀏覽器權限提示中允許相機；若之前已拒絕，請到網站設定開啟相機權限。'
                    : 'GitHub Pages 已提供安全的 https 環境，但仍需要你手動允許相機權限。'}
                </p>
                <button
                  type="button"
                  className="permission-button"
                  onClick={handleStartCamera}
                  disabled={permissionState === PERMISSION_STATE.unsupported}
                >
                  {permissionState === PERMISSION_STATE.denied ? '重新請求相機權限' : '啟動相機'}
                </button>
              </div>
            ) : null}
            <div className="preview-overlay">
              <span>{activePreset.name}</span>
              <span>
                {activePreset.description} · {zoomLevel.toFixed(1)}x
              </span>
            </div>
            {isBooting ? <div className="loading-scrim">啟動鏡頭中…</div> : null}
          </div>

          <div className="control-grid">
            <label className="field">
              <span>鏡頭裝置</span>
              <select
                value={selectedDeviceId}
                onChange={(event) => setSelectedDeviceId(event.target.value)}
                disabled={!stream}
              >
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
              <select value={qualityId} onChange={(event) => setQualityId(event.target.value)} disabled={!stream}>
                {QUALITY_MODES.map((quality) => (
                  <option key={quality.id} value={quality.id}>
                    {quality.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-wide">
              <span>數碼放大</span>
              <div className="zoom-control">
                <input
                  type="range"
                  min={ZOOM_RANGE.min}
                  max={ZOOM_RANGE.max}
                  step={ZOOM_RANGE.step}
                  value={zoomLevel}
                  onChange={(event) => handleZoomChange(event.target.value)}
                />
                <strong>{zoomLevel.toFixed(1)}x</strong>
              </div>
            </label>
          </div>

          <div className="action-row">
            <button type="button" className="secondary-button" onClick={handleStartCamera}>
              {stream ? '重新連線相機' : '啟動相機'}
            </button>
            <button type="button" className="capture-button" onClick={handleCapture} disabled={!stream}>
              拍照並下載
            </button>
            <button
              type="button"
              className={torchEnabled ? 'secondary-button enabled' : 'secondary-button'}
              onClick={handleToggleTorch}
              disabled={!stream || !torchSupported}
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
              <p className="panel-kicker">PWA Permission</p>
              <h2>手機權限指引</h2>
            </div>
          </div>
          <div className="permission-guide-card">
            <span className="permission-guide-pill">
              {isStandalone ? '目前為已安裝 PWA' : '目前為瀏覽器模式'} · 權限狀態：{permissionHintState}
            </span>
            {permissionGuide.map((item) => (
              <p key={item} className="permission-guide-item">
                {item}
              </p>
            ))}
          </div>

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
