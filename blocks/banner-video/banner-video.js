/*
** Authoring format **

Block name: Banner Video

Two-column rows: label | value. A "Slide" row starts a new slide; with a single
slide the "Slide" row can be left out.

Slide                 → starts a slide (second cell optional, e.g. a name)
Desktop Video         → link to the .mp4 shown from 992px
Mobile Video          → link to the .mp4 shown below 992px (falls back to the desktop video)
Desktop Image         → image shown until the video plays (or instead of a video)
Mobile Image          → same for below 992px (falls back to the desktop image)
Text Image            → text image over the banner (e.g. "Explore the world of wood")
Mobile Text Image     → text image below 992px (falls back to the text image)
Link                  → page the whole banner links to
CTA                   → button link; the link text is the label (e.g. "Explore Now")
Desktop CTA Position  → top left of the button, e.g. "50% 43%"
Mobile CTA Position   → e.g. "57% 37%"
Desktop Text Position → centre of the text image, e.g. "30% 50%"
Mobile Text Position  → top left of the text image, e.g. "38% 28%"

Block option (any row before the first slide):
Autoplay              → time per slide in ms, e.g. "5000" (only with more than one slide)
*/

import { createOptimizedPicture } from '../../scripts/aem.js';
import { trackEvent } from '../../scripts/analytics_1.js';

const MOBILE = window.matchMedia('(max-width: 991px)');
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

function text(el) {
  return (el?.textContent || '').trim();
}

function toKey(label) {
  return label.toLowerCase().replace(/[^a-z]+/g, ' ').trim();
}

function linkOf(cell) {
  const a = cell?.querySelector('a[href]');
  if (a) return a.getAttribute('href');
  return text(cell);
}

// "50% 43%" → ['50%', '43%']
function position(value) {
  const parts = (value || '').match(/-?\d+(\.\d+)?(%|px)?/g) || [];
  return parts.length >= 2 ? parts.slice(0, 2).map((p) => (/\d$/.test(p) ? `${p}%` : p)) : null;
}

function absoluteUrl(href) {
  try {
    return new URL(href, window.location.origin).href;
  } catch (e) {
    return href || '';
  }
}

function parse(block) {
  const options = {};
  const slides = [];
  [...block.children].forEach((row) => {
    const [labelCell, valueCell] = [...row.children];
    const key = toKey(text(labelCell));
    if (!key) return;
    if (key === 'slide') {
      slides.push({});
      return;
    }
    if (!slides.length && key === 'autoplay') {
      options.autoplay = parseInt(text(valueCell), 10) || 0;
      return;
    }
    if (!slides.length) slides.push({});
    const slide = slides[slides.length - 1];
    const img = valueCell?.querySelector('img');
    if (img) slide[key] = img;
    else if (key === 'cta') {
      const a = valueCell?.querySelector('a[href]');
      if (a) slide.cta = { label: text(a), href: a.getAttribute('href') };
    } else slide[key] = key.includes('video') || key === 'link' ? linkOf(valueCell) : text(valueCell);
  });
  return { options, slides: slides.filter((s) => s['desktop image'] || s['desktop video']) };
}

function buildPicture(desktop, mobile, alt, eager, className) {
  const picture = createOptimizedPicture(desktop.src, alt, eager, [{ width: '2000' }]);
  if (mobile && mobile.src !== desktop.src) {
    const mobilePicture = createOptimizedPicture(mobile.src, alt, eager, [{ width: '750' }]);
    const webp = mobilePicture.querySelector('source[type="image/webp"]');
    if (webp) {
      webp.media = '(max-width: 991px)';
      picture.prepend(webp);
    }
  }
  if (eager) picture.querySelector('img').setAttribute('fetchpriority', 'high');
  picture.className = className;
  return picture;
}

// the video starts after the poster image so it does not delay the first paint
function bindVideo(slideEl, slide) {
  const desktopSrc = slide['desktop video'];
  const mobileSrc = slide['mobile video'] || desktopSrc;
  if (!desktopSrc || REDUCED_MOTION.matches) return null;

  const video = document.createElement('video');
  video.className = 'banner-video-video';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('preload', 'none');

  const setSource = () => {
    const src = MOBILE.matches ? mobileSrc : desktopSrc;
    if (video.getAttribute('src') === src) return;
    slideEl.classList.remove('is-playing');
    video.src = src;
    if (slideEl.classList.contains('is-active')) video.play().catch(() => {});
  };

  video.addEventListener('playing', () => slideEl.classList.add('is-playing'));
  video.addEventListener('loadedmetadata', () => {
    if (!MOBILE.matches && video.videoWidth) {
      slideEl.style.setProperty('--banner-ratio', `${video.videoWidth} / ${video.videoHeight}`);
    }
  });

  const start = () => {
    setSource();
    MOBILE.addEventListener('change', setSource);
  };
  const poster = slideEl.querySelector('.banner-video-image img');
  if (!poster || poster.complete) start();
  else {
    poster.addEventListener('load', start, { once: true });
    poster.addEventListener('error', start, { once: true });
  }
  return video;
}

function setPosition(el, name, value) {
  const pos = position(value);
  if (!pos) return;
  el.style.setProperty(`--${name}-top`, pos[0]);
  el.style.setProperty(`--${name}-left`, pos[1]);
}

function buildSlide(slide, index) {
  const eager = index === 0;
  const textImg = slide['text image'];
  const title = textImg?.alt || '';

  const slideEl = document.createElement('div');
  slideEl.className = 'banner-video-slide';
  if (eager) slideEl.classList.add('is-active');
  if (slide['desktop video']) slideEl.classList.add('has-video');

  const media = document.createElement(slide.link ? 'a' : 'div');
  media.className = 'banner-video-link';
  if (slide.link) {
    media.href = slide.link;
    if (title) media.setAttribute('aria-label', title);
  }

  if (slide['desktop image']) {
    media.append(buildPicture(slide['desktop image'], slide['mobile image'], '', eager, 'banner-video-image'));
  }
  const video = bindVideo(slideEl, slide);
  if (video) media.append(video);

  if (textImg) {
    media.append(buildPicture(textImg, slide['mobile text image'], title, eager, 'banner-video-text'));
  }
  slideEl.append(media);

  if (slide.cta) {
    const cta = document.createElement('div');
    cta.className = 'banner-video-cta';
    const a = document.createElement('a');
    a.href = slide.cta.href;
    a.textContent = slide.cta.label;
    const arrow = document.createElement('span');
    arrow.className = 'banner-video-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    a.append(arrow);
    a.addEventListener('click', () => {
      trackEvent('custom_cta_click', {
        cta_: slide.cta.label,
        redirectionLink: absoluteUrl(slide.cta.href),
        parentTitle: title,
      });
    });
    cta.append(a);
    slideEl.append(cta);
  }

  setPosition(slideEl, 'cta-desktop', slide['desktop cta position']);
  setPosition(slideEl, 'cta-mobile', slide['mobile cta position']);
  setPosition(slideEl, 'text-desktop', slide['desktop text position']);
  setPosition(slideEl, 'text-mobile', slide['mobile text position']);
  return slideEl;
}

// fade slider with dots, only when there is more than one slide
function bindSlider(block, slideEls, autoplay) {
  let active = 0;
  let timer;

  const nav = document.createElement('div');
  nav.className = 'banner-video-nav';
  const arrowButton = (dir, label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `banner-video-${dir}`;
    button.setAttribute('aria-label', label);
    return button;
  };
  const prev = arrowButton('prev', 'Previous slide');
  const next = arrowButton('next', 'Next slide');
  const dots = slideEls.map((el, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'banner-video-dot';
    dot.setAttribute('aria-label', `Go to slide ${i + 1} of ${slideEls.length}`);
    return dot;
  });
  nav.append(prev, ...dots, next);
  block.append(nav);

  const show = (index) => {
    active = (index + slideEls.length) % slideEls.length;
    slideEls.forEach((el, i) => {
      const current = i === active;
      el.classList.toggle('is-active', current);
      el.setAttribute('aria-hidden', !current);
      el.inert = !current;
      const video = el.querySelector('video');
      if (video && video.getAttribute('src')) {
        if (current) video.play().catch(() => {});
        else video.pause();
      }
    });
    dots.forEach((dot, i) => dot.setAttribute('aria-current', i === active));
    prev.disabled = active === 0;
    next.disabled = active === slideEls.length - 1;
    if (autoplay) {
      clearTimeout(timer);
      timer = setTimeout(() => show(active + 1), autoplay);
    }
  };

  prev.addEventListener('click', () => show(active - 1));
  next.addEventListener('click', () => show(active + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
  show(0);
}

export default function decorate(block) {
  const { options, slides } = parse(block);
  if (!slides.length) return;

  const track = document.createElement('div');
  track.className = 'banner-video-slides';
  const slideEls = slides.map(buildSlide);
  track.append(...slideEls);
  block.replaceChildren(track);

  if (slideEls.length > 1) {
    block.classList.add('is-slider');
    bindSlider(block, slideEls, options.autoplay);
  }
}
