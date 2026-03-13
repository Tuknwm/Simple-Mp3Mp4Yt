// main.js
import './styles/main.scss'

// ─── Config ───────────────────────────────────────────────
const RAPIDAPI_KEY = 'c48cd6ea2bmsh2c687b318506cdbp1f9542jsn1922ea2f6f69'
const YTSTREAM_HOST = 'ytstream-download-youtube-videos.p.rapidapi.com'
const MP3_HOST = 'youtube-mp36.p.rapidapi.com'

// ─── State ────────────────────────────────────────────────
let currentFormat = 'mp4'
let videoData = null
let debounceTimer = null

// ─── DOM refs ─────────────────────────────────────────────
const urlInput = document.getElementById('urlInput')
const clearBtn = document.getElementById('clearBtn')
const submitBtn = document.getElementById('submitBtn')
const statusEl = document.getElementById('status')
const previewEl = document.getElementById('preview')
const previewThumb = document.getElementById('previewThumb')
const previewTitle = document.getElementById('previewTitle')
const previewChan = document.getElementById('previewChannel')
const previewDur = document.getElementById('previewDuration')
const progressEl = document.getElementById('progress')
const progressFill = document.getElementById('progressFill')
const progressLabel = document.getElementById('progressLabel')
const dlLink = document.getElementById('dlLink')

// ─── Utils ────────────────────────────────────────────────
function extractVideoId(input) {
  input = input.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = input.match(p)
    if (m) return m[1]
  }
  return null
}

function formatDuration(secs) {
  secs = parseInt(secs)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatViews(n) {
  n = parseInt(n)
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M views'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K views'
  return n + ' views'
}

// ─── UI helpers ───────────────────────────────────────────
function setStatus(msg, type = '') {
  statusEl.textContent = msg
  statusEl.className = 'status ' + type
}

function setLoading(on) {
  submitBtn.disabled = on
  const textEl = submitBtn.querySelector('.submit-text')
  const arrowEl = submitBtn.querySelector('.submit-arrow')
  textEl.textContent = on ? 'Processing' : 'Download'
  arrowEl.innerHTML = on
    ? '<span class="spinner"></span>'
    : '→'
}

function showProgress(indeterminate = true, pct = 0, label = 'Processing...') {
  progressEl.classList.add('visible')
  progressLabel.textContent = label
  if (indeterminate) {
    progressFill.className = 'progress-fill indeterminate'
  } else {
    progressFill.className = 'progress-fill'
    progressFill.style.width = pct + '%'
  }
}

function hideProgress() {
  progressEl.classList.remove('visible')
  progressFill.style.width = '0%'
}

function showDlLink(url, filename) {
  dlLink.href = url
  dlLink.download = filename
  dlLink.querySelector('span').textContent = filename
  dlLink.classList.add('visible')
  setTimeout(() => dlLink.click(), 300)
}


function hideDlLink() {
  dlLink.classList.remove('visible')
  dlLink.href = '#'
}

function showPreview(data) {
  const thumb = data.thumbnail?.[data.thumbnail.length - 1]?.url || ''
  previewThumb.src = thumb
  previewTitle.textContent = data.title || '—'
  previewChan.textContent = data.channelTitle || '—'
  previewDur.textContent = formatDuration(data.lengthSeconds) +
    (data.viewCount ? ' · ' + formatViews(data.viewCount) : '')
  previewEl.classList.add('visible')
}

function hidePreview() {
  previewEl.classList.remove('visible')
}

// ─── Format toggle ────────────────────────────────────────
window.setFormat = function (fmt) {
  currentFormat = fmt
  document.getElementById('optMp4').classList.toggle('active', fmt === 'mp4')
  document.getElementById('optMp3').classList.toggle('active', fmt === 'mp3')
  hideDlLink()
  setStatus('')
}

// ─── Clear ────────────────────────────────────────────────
window.clearInput = function () {
  urlInput.value = ''
  clearBtn.style.display = 'none'
  hidePreview()
  hideDlLink()
  hideProgress()
  setStatus('')
  videoData = null
}

// ─── Input events ─────────────────────────────────────────
urlInput.addEventListener('input', function () {
  const val = this.value.trim()
  clearBtn.style.display = val ? 'block' : 'none'
  hideDlLink()
  clearTimeout(debounceTimer)

  if (!val) {
    hidePreview()
    setStatus('')
    videoData = null
    return
  }

  const vid = extractVideoId(val)
  if (vid) {
    debounceTimer = setTimeout(() => fetchInfo(vid), 700)
  } else {
    setStatus('o_o i dont know this url', 'error')
  }
})

urlInput.addEventListener('paste', function () {
  clearTimeout(debounceTimer)
  setTimeout(() => {
    const vid = extractVideoId(this.value)
    if (vid) fetchInfo(vid)
  }, 50)
})

// ─── Fetch video info ─────────────────────────────────────
async function fetchInfo(vid) {
  videoData = null
  hidePreview()
  hideDlLink()
  setStatus('Fetching info...', '')
  showProgress(true, 0, 'Fetching...')

  try {
    const res = await fetch(`https://${YTSTREAM_HOST}/dl?id=${vid}`, {
      headers: {
        'x-rapidapi-host': YTSTREAM_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
      }
    })
    const data = await res.json()
    if (data.status !== 'OK') throw new Error('Video not found or unavailable')

    videoData = data
    videoData._vid = vid

    videoData._muxed = (data.formats || [])
      .filter(f => f.audioQuality && f.mimeType?.includes('video/mp4'))
      .sort((a, b) => (b.height || 0) - (a.height || 0))

    showPreview(data)
    hideProgress()
    setStatus('(☆▽☆) Ready', 'success')
  } catch (err) {
    hideProgress()
    setStatus('Error: ' + err.message, 'error')
  }
}

// ─── Download ─────────────────────────────────────────────
window.startDownload = async function () {
  const val = urlInput.value.trim()
  const vid = extractVideoId(val)

  if (!vid) {
    setStatus('o(*￣▽￣*)ブ Please enter a valid YouTube URL first', 'error')
    return
  }

  if (!videoData) {
    await fetchInfo(vid)
    if (!videoData) return
  }

  hideDlLink()
  setLoading(true)

  if (currentFormat === 'mp4') {
    await downloadMp4()
  } else {
    await downloadMp3(videoData._vid)
  }

  setLoading(false)
}

async function downloadMp4() {
  setStatus('(・・?) Fetching link...', '')
  showProgress(true, 0, 'Fetching...')

  try {
    const res = await fetch(`https://${YTSTREAM_HOST}/dl?id=${videoData._vid}`, {
      headers: {
        'x-rapidapi-host': YTSTREAM_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
      }
    })
    const data = await res.json()
    if (data.status !== 'OK') throw new Error('(╯°□°）╯ Video not found or unavailable')

    const muxed = (data.formats || [])
      .filter(f => f.audioQuality && f.mimeType?.includes('video/mp4'))
      .sort((a, b) => (b.height || 0) - (a.height || 0))

    const fmt = muxed?.[0]
    if (!fmt?.url) throw new Error('≧ ﹏ ≦ No downloadable format found')

    const safe = (videoData.title || 'video')
      .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
    const filename = safe + '_' + (fmt.qualityLabel || '360p') + '.mp4'

    hideProgress()
    showDlLink(fmt.url, filename)
    setStatus('')

  } catch (err) {
    hideProgress()
    setStatus('Error: ' + err.message, 'error')
  }
}

async function downloadMp3(vid) {
  setStatus('Converting to MP3...', '')
  showProgress(true, 0, 'Converting...')

  try {
    const safe = (videoData?.title || 'audio')
      .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')

    let link = null
    let tries = 0

    while (tries < 20 && !link) {
      const res = await fetch(`https://${MP3_HOST}/dl?id=${vid}`, {
        headers: {
          'x-rapidapi-host': MP3_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        }
      })
      const data = await res.json()

      if (data.status === 'ok' && data.link) {
        link = data.link
        showProgress(false, 100, 'Done!')
      } else if (data.status === 'fail') {
        throw new Error('Conversion failed')
      } else {
        const pct = data.progress || Math.min(tries * 6, 85)
        showProgress(false, pct, `Converting... ${Math.round(pct)}%`)
        await new Promise(r => setTimeout(r, 2000))
        tries++
      }
    }

    if (!link) throw new Error('Timeout — please try again')

    const filename = safe + '.mp3'
    hideProgress()
    showDlLink(link, filename)
    setStatus('')

  } catch (err) {
    hideProgress()
    setStatus('Error: ' + err.message, 'error')
  }
}