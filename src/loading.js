// loading.js — standalone loading screen
; (function () {
    const C = 'var(--text,#1a1a1a)'

    const style = document.createElement('style')
    style.textContent = `
    body.ls-active > *:not(#LS-root) { visibility: hidden !important; }
    @keyframes LSdrift {
      0%   { opacity:1; transform:translate(0,0) scale(1) rotate(0deg); }
      100% { opacity:0; transform:translate(var(--tx),var(--ty)) scale(0) rotate(var(--tr)); }
    }
    @keyframes LSboxIn {
      from { opacity:0; transform:scale(0.96) translateY(8px); }
      to   { opacity:1; transform:scale(1) translateY(0); }
    }
    #LS-root { animation: LSboxIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
  `
    document.head.appendChild(style)

    const root = document.createElement('div')
    root.id = 'LS-root'
    root.style.cssText = `
    position:fixed;inset:0;z-index:99999;
    display:flex;align-items:center;justify-content:center;
    background:rgba(248,249,250,0.45);
    backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  `
    root.innerHTML = `
    <div id="LS-parts" style="position:absolute;inset:0;pointer-events:none;"></div>
    <div id="LS-box" style="
      position:relative;
      width:min(440px,86vw);padding:52px 40px;
      border:1.5px solid rgba(26,26,26,0.13);border-radius:3px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      min-height:160px;
      background:rgba(248,249,250,0.7);
      backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    ">
      <div id="LS-stage" style="position:relative;width:100%;display:flex;align-items:center;justify-content:center;min-height:90px;"></div>
    </div>
  `

    function init() {
        document.body.classList.add('ls-active')
        document.body.appendChild(root)
        run()
    }

    if (document.body) {
        init()
    } else {
        document.addEventListener('DOMContentLoaded', init)
    }

    const stage = () => document.getElementById('LS-stage')
    const parts = () => document.getElementById('LS-parts')

    const rf = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    const wait = ms => new Promise(r => setTimeout(r, ms))

    function mkEl(tag, css, text) {
        const el = document.createElement(tag)
        el.style.cssText = css
        if (text !== undefined) el.textContent = text
        return el
    }

    async function phase1() {
        const CHARS = ['く', 'ろ', 'き', 'ゅ', 'う']
        const OFFSETS = [-22, 22, -22, 22, -22]
        const SIZE = 'clamp(44px,9vw,72px)'

        const wrap = mkEl('div', 'display:flex;align-items:center;justify-content:center;gap:clamp(8px,2vw,18px);')
        stage().appendChild(wrap)

        const spans = CHARS.map((ch, i) => {
            const s = mkEl('span', `
        display:inline-block;font-family:serif;font-size:${SIZE};
        color:${C};line-height:1;opacity:0;
        transform:translateY(${OFFSETS[i]}px);
        transition:opacity 0.22s ease, transform 0.28s cubic-bezier(0.34,1.4,0.64,1);
        will-change:transform,opacity;
      `, ch)
            wrap.appendChild(s)
            return s
        })

        await rf()

        spans.forEach((s, i) => {
            setTimeout(() => { s.style.opacity = '1' }, i * 55)
        })
        await wait(CHARS.length * 55 + 200)

        spans.forEach(s => {
            s.style.transition = 'transform 0.38s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease'
            s.style.transform = 'translateY(0)'
        })
        await wait(420)
        return { wrap, spans }
    }

    async function phase2({ wrap }) {
        await wait(150)

        wrap.style.transition = 'opacity 0.28s ease, transform 0.32s cubic-bezier(0.4,0,0.6,1)'
        wrap.style.opacity = '0'
        wrap.style.transform = 'translateY(-18px)'
        await wait(320)

        stage().innerHTML = ''
        const SIZE = 'clamp(38px,8vw,64px)'

        const enWrap = mkEl('div', `
      display:flex;align-items:center;justify-content:center;gap:1px;
      opacity:0;transform:translateY(14px);
      transition:opacity 0.3s ease, transform 0.35s cubic-bezier(0.22,1,0.36,1);
    `)
        'KuroKyu'.split('').forEach(ch => {
            enWrap.appendChild(mkEl('span', `
        display:inline-block;font-family:'KronaOne',sans-serif;
        font-size:${SIZE};color:${C};line-height:1;
      `, ch))
        })
        stage().appendChild(enWrap)

        await rf()
        enWrap.style.opacity = '1'
        enWrap.style.transform = 'translateY(0)'
        await wait(500)

        enWrap.style.transition = 'opacity 0.28s ease, transform 0.32s cubic-bezier(0.4,0,0.6,1)'
        enWrap.style.opacity = '0'
        enWrap.style.transform = 'translateY(-20px)'
        await wait(320)
    }

    async function phase3() {
        stage().innerHTML = ''
        const em = mkEl('span', `
      display:inline-block;font-family:serif;
      font-size:clamp(36px,7vw,58px);color:${C};line-height:1;
      opacity:0;transform:translateY(16px);
      transition:opacity 0.32s ease, transform 0.38s cubic-bezier(0.22,1,0.36,1);
      user-select:none;
    `, '＞︿＜')
        stage().appendChild(em)
        await rf()
        em.style.opacity = '1'
        em.style.transform = 'translateY(0)'
        await wait(600)
        return em
    }

    async function exitBlur(emEl) {
        const rect = emEl.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2

        for (let i = 0; i < 40; i++) {
            const p = document.createElement('div')
            const ang = Math.random() * 360
            const d = 50 + Math.random() * 150
            const tx = Math.cos(ang * Math.PI / 180) * d
            const ty = Math.sin(ang * Math.PI / 180) * d - Math.random() * 80
            const sz = 3 + Math.random() * 6
            const dur = 0.4 + Math.random() * 0.4
            const dl = Math.random() * 0.15
            const ch = ['·', '•', '˙', '∘'][Math.floor(Math.random() * 4)]
            p.textContent = ch
            p.style.cssText = `
        position:absolute;left:${cx}px;top:${cy}px;font-size:${sz}px;
        color:${C};--tx:${tx}px;--ty:${ty}px;--tr:${(Math.random() - .5) * 480}deg;
        animation:LSdrift ${dur}s ease-out ${dl}s forwards;pointer-events:none;
      `
            parts().appendChild(p)
        }

        root.style.transition = 'opacity 0.45s ease, filter 0.45s ease'
        root.style.filter = 'blur(12px)'
        root.style.opacity = '0'
        await wait(460)

        root.style.display = 'none'
        document.body.classList.remove('ls-active')

        const firstPage = document.getElementById('pageYT')
        if (firstPage) {
            firstPage.classList.remove('page-enter')
            void firstPage.offsetWidth
            requestAnimationFrame(() => requestAnimationFrame(() => {
                firstPage.classList.add('page-enter')
            }))
        }
    }

    async function run() {
        await wait(120)
        const jp = await phase1()
        await phase2(jp)
        const em = await phase3()
        await exitBlur(em)
    }
})()