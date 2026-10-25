function initVideoCard(card) {
    const video = card.querySelector('video.video-player');
    const start = card.querySelector('button.video-start');
    const pause = card.querySelector('button.video-pause');
    const link = card.querySelector('a.video-yt');
    const sources = video ? Array.from(video.querySelectorAll('source')) : [];
    const fullSource = sources.find((s) => s.dataset.full);
    const track = video && video.querySelector('track');
    if (!video || !start || !pause || !link || !track || !fullSource || !start.dataset.ytLabel)
        return;
    let full = false;
    let observer = null;
    const userPaused = () => pause.getAttribute('aria-pressed') === 'true';
    const useSources = (key) => {
        sources.forEach((s) => {
            if (s.dataset[key])
                s.src = s.dataset[key];
            else
                s.removeAttribute('src');
        });
        video.load();
    };
    const playPreview = () => {
        if (full || userPaused())
            return;
        if (!sources[0].getAttribute('src'))
            useSources('preview');
        video.muted = true;
        video.play().then(() => {
            if (full)
                return;
            video.hidden = false;
            pause.hidden = false;
        }, () => { });
    };
    if (video.canPlayType(fullSource.type) === '')
        start.setAttribute('aria-label', start.dataset.ytLabel);
    start.hidden = false;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        || Boolean(navigator.connection && navigator.connection.saveData);
    if (!still && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
            const last = entries[entries.length - 1];
            if (last.intersectionRatio >= 0.5)
                playPreview();
            else if (!full)
                video.pause();
        }, { threshold: [0, 0.5] });
        observer.observe(card);
    }
    pause.addEventListener('click', () => {
        const nowPaused = !userPaused();
        pause.setAttribute('aria-pressed', String(nowPaused));
        if (nowPaused)
            video.pause();
        else
            playPreview();
    });
    start.addEventListener('click', () => {
        if (full)
            return;
        if (video.canPlayType(fullSource.type) === '') {
            link.click();
            return;
        }
        full = true;
        if (observer)
            observer.disconnect();
        start.hidden = true;
        pause.hidden = true;
        video.pause();
        video.preload = 'auto';
        video.loop = false;
        video.muted = false;
        video.controls = true;
        video.poster = video.dataset.poster;
        track.src = track.dataset.src;
        useSources('full');
        const showCaptions = () => { if (video.textTracks[0])
            video.textTracks[0].mode = 'showing'; };
        showCaptions();
        video.addEventListener('loadedmetadata', showCaptions, { once: true });
        video.hidden = false;
        card.classList.add('is-playing');
        video.play().catch(() => { });
        video.focus();
    });
}
export function initVideoCards(root = document) { root.querySelectorAll('.video-card').forEach(initVideoCard); }
