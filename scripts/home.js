/* KMH Engineering - home page behaviour (intro, menu highlight, sliders) */
(function () {
    'use strict';

    var body = document.body;
    var desktop = window.matchMedia('(min-width: 992px)');

    /* ---------- Mobile menu toggle ---------- */
    var toggle = document.querySelector('.kmh-menu-toggle');
    if (toggle) {
        toggle.addEventListener('click', function () {
            var open = body.classList.toggle('menu-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        document.querySelectorAll('.kmh-rail-panel a').forEach(function (a) {
            a.addEventListener('click', function () {
                body.classList.remove('menu-open');
                toggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    /* ---------- Intro animation ---------- */
    var intro = document.getElementById('home');
    var introVideo = intro && intro.querySelector('video');
    // Quick eased scroll (the browser's native smooth scroll is slow over a full screen)
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function quickScrollTo(el, duration) {
        var root = document.documentElement;
        var start = window.scrollY;
        var end = el.getBoundingClientRect().top + start;
        var t0 = null;
        root.style.scrollBehavior = 'auto';           // per-frame jumps, not CSS smoothing
        if (reduceMotion.matches) { window.scrollTo(0, end); root.style.scrollBehavior = ''; return; }
        function step(ts) {
            if (t0 === null) { t0 = ts; }
            var k = Math.min(1, (ts - t0) / duration);
            var ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   // easeInOutCubic
            window.scrollTo(0, start + (end - start) * ease);
            if (k < 1) { requestAnimationFrame(step); } else { root.style.scrollBehavior = ''; }
        }
        requestAnimationFrame(step);
    }

    if (introVideo) {
        var advanced = false;
        var finishIntro = function () {
            if (advanced) { return; }
            advanced = true;
            intro.classList.add('is-done');
            // Move on to the About section if the visitor is still on the intro
            if (window.scrollY < 10 && desktop.matches) {
                quickScrollTo(document.getElementById('about'), 550);
            }
        };
        // Start moving just before the last frame so there is no pause
        introVideo.addEventListener('timeupdate', function () {
            if (introVideo.duration && introVideo.currentTime >= introVideo.duration - 0.25) { finishIntro(); }
        });
        introVideo.addEventListener('ended', finishIntro);
        // If autoplay is blocked, still show the scroll cue
        var p = introVideo.play && introVideo.play();
        if (p && p.catch) { p.catch(function () { intro.classList.add('is-done'); }); }
    }

    /* ---------- Menu highlight follows the section in view ---------- */
    var menuFor = {
        home: 'home', about: 'about', services: 'services',
        projects: 'projects', deliveries: 'projects', clients: 'projects'
    };
    var links = {};
    document.querySelectorAll('.kmh-menu a[data-section]').forEach(function (a) {
        links[a.getAttribute('data-section')] = a;
    });

    function setActive(id) {
        var key = menuFor[id];
        Object.keys(links).forEach(function (k) {
            links[k].classList.toggle('is-active', k === key);
            if (k === key) { links[k].setAttribute('aria-current', 'true'); } else { links[k].removeAttribute('aria-current'); }
        });
        body.classList.toggle('at-intro', id === 'home');
    }

    var sections = document.querySelectorAll('.kmh-section[id]');
    if ('IntersectionObserver' in window) {
        var spy = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) { setActive(e.target.id); }
            });
        }, { rootMargin: '-45% 0px -45% 0px' });
        sections.forEach(function (s) { spy.observe(s); });

        // Only play section videos while they are on screen
        var vidObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                var v = e.target;
                if (e.isIntersecting) {
                    var pr = v.play();
                    if (pr && pr.catch) { pr.catch(function () {}); }
                } else {
                    v.pause();
                }
            });
        }, { threshold: 0.25 });
        document.querySelectorAll('video[data-autoplay-visible]').forEach(function (v) { vidObs.observe(v); });
    } else {
        setActive('home');
    }

    /* ---------- Services slideshow (one video, 5 slides of 2 seconds) ---------- */
    var svc = document.querySelector('.kmh-services-slider');
    if (svc) {
        var video = svc.querySelector('video');
        var slideLen = parseFloat(svc.getAttribute('data-slide-seconds')) || 2;
        var dots = Array.prototype.slice.call(svc.querySelectorAll('.kmh-slide-dots button'));
        var count = dots.length;
        var texts = Array.prototype.slice.call(svc.querySelectorAll('.kmh-svc-text'));

        var current = function () { return Math.min(count - 1, Math.floor(video.currentTime / slideLen)); };
        var go = function (i) {
            i = (i + count) % count;
            video.currentTime = i * slideLen + 0.05;
            var pr = video.play();
            if (pr && pr.catch) { pr.catch(function () {}); }
            refresh();
        };
        var shown = -1;
        var refresh = function () {
            var c = current();
            if (c === shown) { return; }
            shown = c;
            dots.forEach(function (d, i) { d.classList.toggle('is-active', i === c); });
            texts.forEach(function (t, i) { t.classList.toggle('is-active', i === c); });
        };
        svc.querySelector('.kmh-chevron.prev').addEventListener('click', function () { go(current() - 1); });
        svc.querySelector('.kmh-chevron.next').addEventListener('click', function () { go(current() + 1); });
        dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });

        // Keep the HTML text in step with the video's slides (frame-accurate where supported)
        if ('requestVideoFrameCallback' in video) {
            var onFrame = function () { refresh(); video.requestVideoFrameCallback(onFrame); };
            video.requestVideoFrameCallback(onFrame);
        }
        video.addEventListener('timeupdate', refresh);
        video.addEventListener('seeked', refresh);
    }

    /* ---------- Projects carousel ---------- */
    var proj = document.querySelector('.kmh-projects-slider');
    if (proj) {
        var track = proj.querySelector('.kmh-project-track');
        var pages = Array.prototype.slice.call(track.children);
        var idx = 0;
        var show = function (i) {
            idx = (i + pages.length) % pages.length;
            track.style.transform = 'translateX(' + (-100 * idx) + '%)';
            pages.forEach(function (pg, n) {
                var hidden = n !== idx;
                pg.setAttribute('aria-hidden', hidden ? 'true' : 'false');
                pg.querySelectorAll('a').forEach(function (a) {
                    if (hidden) { a.setAttribute('tabindex', '-1'); } else { a.removeAttribute('tabindex'); }
                });
            });
        };
        proj.querySelector('.kmh-chevron.prev').addEventListener('click', function () { show(idx - 1); });
        proj.querySelector('.kmh-chevron.next').addEventListener('click', function () { show(idx + 1); });
        show(0);
    }

    /* ---------- Gentle fade-up of content as it scrolls into view ---------- */
    if ('IntersectionObserver' in window && !reduceMotion.matches) {
        var revealSel = '.kmh-section:not(.kmh-intro) .kmh-title, .kmh-lead, .kmh-about p, .kmh-about-media, ' +
            '.kmh-slider, .kmh-clients-intro, .kmh-client-logos img, .kmh-know-more';
        var revealEls = Array.prototype.slice.call(document.querySelectorAll(revealSel));
        var revealObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) { return; }
                var el = e.target;
                el.classList.add('is-visible');
                revealObs.unobserve(el);
                // hand control back to the element's own hover transitions once revealed
                setTimeout(function () {
                    el.classList.remove('kmh-reveal', 'is-visible');
                    el.style.transitionDelay = '';
                }, 1200);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        revealEls.forEach(function (el) {
            // stagger siblings slightly (client logos)
            var sib = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
            if (el.matches('.kmh-client-logos img')) { el.style.transitionDelay = (sib * 0.08) + 's'; }
            el.classList.add('kmh-reveal');
            revealObs.observe(el);
        });
    }

    /* ---------- Deliveries timeline builds from 2018 to 2026 when it comes into view ---------- */
    var timeline = document.querySelector('.kmh-timeline');
    if (timeline && 'IntersectionObserver' in window && !reduceMotion.matches) {
        timeline.classList.add('tl-armed');
        var tlObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) { return; }
                // next frame, so the "armed" (hidden) state is painted before the build starts
                requestAnimationFrame(function () { timeline.classList.add('tl-play'); });
                tlObs.disconnect();
            });
        }, { threshold: 0.35 });
        tlObs.observe(timeline);
    }
})();
