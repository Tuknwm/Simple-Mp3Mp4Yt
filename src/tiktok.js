// tiktok.js — TikTok downloader logic
// Uses: tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com

const RAPIDAPI_KEY = 'c48cd6ea2bmsh2c687b318506cdbp1f9542jsn1922ea2f6f69'
const TT_HOST = 'tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com'

// ─── State ────────────────────────────────────────────────
let ttCurrentFormat = 'mp4'
let ttVideoData = null
let ttDebounceTimer = null

// ─── DOM refs ─────────────────────────────────────────────
const ttUrlInput = document.getElementById('ttUrlInput')
const ttClearBtnEl = document.getElementById('ttClearBtn')
const ttSubmitBtn = document.getElementById('ttSubmitBtn')
const ttStatusEl = document.getElementById('ttStatus')
const ttPreviewEl = document.getElementById('ttPreview')
const ttPreviewThumb = document.getElementById('ttPreviewThumb')
const ttPreviewTitle = document.getElementById('ttPreviewTitle')
const ttPreviewChan = document.getElementById('ttPreviewChannel')
const ttPreviewDur = document.getElementById('ttPreviewDuration')
const ttProgressEl = document.getElementById('ttProgress')
const ttProgressFill = document.getElementById('ttProgressFill')
const ttProgressLabel = document.getElementById('ttProgressLabel')
const ttDlLink = document.getElementById('ttDlLink')

// ─── Utils ────────────────────────────────────────────────
function isTikTokUrl(url) {
    return /tiktok\.com/i.test(url) || /vm\.tiktok\.com/i.test(url) || /vt\.tiktok\.com/i.test(url)
}

function ttFormatDuration(secs) {
    if (!secs) return ''
    secs = parseInt(secs)
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── UI helpers ───────────────────────────────────────────
function ttSetStatus(msg, type = '') {
    ttStatusEl.textContent = msg
    ttStatusEl.className = 'status ' + type
}

function ttSetLoading(on) {
    ttSubmitBtn.disabled = on
    const textEl = ttSubmitBtn.querySelector('.submit-text')
    const arrowEl = ttSubmitBtn.querySelector('.submit-arrow')
    textEl.textContent = on ? 'Processing' : 'Download'
    arrowEl.innerHTML = on ? '<span class="spinner"></span>' : '→'
}

function ttShowProgress(indeterminate = true, pct = 0, label = 'Processing...') {
    ttProgressEl.classList.add('visible')
    ttProgressLabel.textContent = label
    if (indeterminate) {
        ttProgressFill.className = 'progress-fill indeterminate'
    } else {
        ttProgressFill.className = 'progress-fill'
        ttProgressFill.style.width = pct + '%'
    }
}

function ttHideProgress() {
    ttProgressEl.classList.remove('visible')
    ttProgressFill.style.width = '0%'
}

function ttShowDlLink(url, filename) {
    ttDlLink.href = url
    ttDlLink.download = filename
    ttDlLink.querySelector('span').textContent = filename
    ttDlLink.classList.add('visible')
    setTimeout(() => ttDlLink.click(), 300)
}

function ttHideDlLink() {
    ttDlLink.classList.remove('visible')
    ttDlLink.href = '#'
}

function ttShowPreview(data) {
    const thumb = data.cover?.[0] || data.cover || data.origin_cover || data.thumbnail || ''
    ttPreviewThumb.src = thumb
    ttPreviewTitle.textContent = data.title || data.desc || '—'
    ttPreviewChan.textContent = data.author?.nickname || data.author?.unique_id || data.author || '—'
    const dur = ttFormatDuration(data.duration)
    ttPreviewDur.textContent = dur || ''
    ttPreviewEl.classList.add('visible')
}

function ttHidePreview() {
    ttPreviewEl.classList.remove('visible')
}

// ─── Format toggle ────────────────────────────────────────
window.ttSetFormat = function (fmt) {
    ttCurrentFormat = fmt
    document.getElementById('ttOptMp4').classList.toggle('active', fmt === 'mp4')
    document.getElementById('ttOptMp3').classList.toggle('active', fmt === 'mp3')
    ttHideDlLink()
    ttSetStatus('')
}

// ─── Clear ────────────────────────────────────────────────
window.ttClearInput = function () {
    ttUrlInput.value = ''
    ttClearBtnEl.style.display = 'none'
    ttHidePreview()
    ttHideDlLink()
    ttHideProgress()
    ttSetStatus('')
    ttVideoData = null
}

// ─── Input events ─────────────────────────────────────────
ttUrlInput.addEventListener('input', function () {
    const val = this.value.trim()
    ttClearBtnEl.style.display = val ? 'block' : 'none'
    ttHideDlLink()
    clearTimeout(ttDebounceTimer)

    if (!val) {
        ttHidePreview()
        ttSetStatus('')
        ttVideoData = null
        return
    }

    if (isTikTokUrl(val)) {
        ttDebounceTimer = setTimeout(() => ttFetchInfo(val), 700)
    } else {
        ttSetStatus('o_o i dont know this url', 'error')
    }
})

ttUrlInput.addEventListener('paste', function () {
    clearTimeout(ttDebounceTimer)
    setTimeout(() => {
        const val = this.value.trim()
        if (isTikTokUrl(val)) ttFetchInfo(val)
    }, 50)
})

// ─── Fetch TikTok info ────────────────────────────────────
async function ttFetchInfo(url) {
    ttVideoData = null
    ttHidePreview()
    ttHideDlLink()
    ttSetStatus('Fetching info...', '')
    ttShowProgress(true, 0, 'Fetching...')

    try {
        const endpoint = `https://${TT_HOST}/index?url=${encodeURIComponent(url)}`
        console.log('[TT] fetching:', endpoint)

        const res = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-rapidapi-host': TT_HOST,
                'x-rapidapi-key': RAPIDAPI_KEY,
            }
        })

        const contentType = res.headers.get('content-type') || ''
        console.log('[TT] status:', res.status, '| content-type:', contentType)

        if (!res.ok) {
            const txt = await res.text()
            console.error('[TT] error body:', txt.slice(0, 300))
            throw new Error(`API error ${res.status}`)
        }

        if (!contentType.includes('application/json')) {
            const txt = await res.text()
            console.error('[TT] non-json:', txt.slice(0, 300))
            throw new Error('Unexpected response from API')
        }

        const raw = await res.json()
        console.log('[TT] raw response:', raw)

        const video = raw.result ?? raw.data ?? raw

        const hasVideo =
            video.play || video.hdplay || video.nwm_video_url ||
            video.video || video.wmplay || video.download_url

        if (!hasVideo) {
            console.warn('[TT] structure:', JSON.stringify(video).slice(0, 400))
            throw new Error('Video not found or unavailable')
        }

        ttVideoData = video
        ttVideoData._originalUrl = url

        ttHideProgress()
        ttShowPreview(video)
        ttSetStatus('(☆▽☆) Ready', 'success')

    } catch (err) {
        ttHideProgress()
        console.error('[TT] error:', err)
        ttSetStatus('Error: ' + err.message, 'error')
    }
}

// ─── Download ─────────────────────────────────────────────
window.ttStartDownload = async function () {
    const val = ttUrlInput.value.trim()

    if (!isTikTokUrl(val)) {
        ttSetStatus('o(*￣▽￣*)ブ Please enter a valid TikTok URL first', 'error')
        return
    }

    if (!ttVideoData) {
        await ttFetchInfo(val)
        if (!ttVideoData) return
    }

    ttHideDlLink()
    ttSetLoading(true)

    if (ttCurrentFormat === 'mp4') {
        await ttDownloadMp4()
    } else {
        await ttDownloadMp3()
    }

    ttSetLoading(false)
}

async function ttDownloadMp4() {
    ttSetStatus('(・・?) Preparing link...', '')
    ttShowProgress(true, 0, 'Preparing...')

    try {
        const videoUrl =
            ttVideoData.video?.[0] ||
            ttVideoData.nwm_video_url?.[0] ||
            ttVideoData.nwm_video_url ||
            ttVideoData.hdplay?.[0] ||
            ttVideoData.hdplay ||
            ttVideoData.play?.[0] ||
            ttVideoData.play ||
            ttVideoData.download_url

        console.log('[TT] mp4 url:', videoUrl)
        if (!videoUrl) throw new Error('≧ ﹏ ≦ No downloadable format found')

        const safe = (ttVideoData.title || ttVideoData.desc || 'tiktok')
            .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60)
        const filename = (safe || 'tiktok') + '_nowm.mp4'

        ttHideProgress()
        ttShowDlLink(videoUrl, filename)
        ttSetStatus('')

    } catch (err) {
        ttHideProgress()
        ttSetStatus('Error: ' + err.message, 'error')
    }
}

async function ttDownloadMp3() {
    ttSetStatus('Extracting audio...', '')
    ttShowProgress(true, 0, 'Extracting...')

    try {
        const audioUrl =
            ttVideoData.music?.[0] ||
            ttVideoData.music_info?.play ||
            ttVideoData.music_url ||
            ttVideoData.audio?.[0] ||
            ttVideoData.audio ||
            ttVideoData.bgm_url

        console.log('[TT] mp3 url:', audioUrl)
        if (!audioUrl) throw new Error('≧ ﹏ ≦ No audio found for this video')

        const safe = (
            ttVideoData.music_info?.title ||
            ttVideoData.title ||
            ttVideoData.desc ||
            'tiktok_audio'
        ).replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60)
        const filename = (safe || 'tiktok_audio') + '.mp3'

        ttShowProgress(false, 100, 'Done!')
        setTimeout(() => ttHideProgress(), 600)
        ttShowDlLink(audioUrl, filename)
        ttSetStatus('')

    } catch (err) {
        ttHideProgress()
        ttSetStatus('Error: ' + err.message, 'error')
    }
}