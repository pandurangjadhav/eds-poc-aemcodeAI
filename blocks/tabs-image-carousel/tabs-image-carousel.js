/*
** Authoring format **

Block name: Tabs Image Carousel

Optional first row with column labels for authors
("Desktop Image | Mobile Image | Link | Button Label") - it is skipped.

Tab row - starts a new tab
Col 1 → "Tab"
Col 2 → Tab title (e.g. "Sabyasachi I")

Slide rows - one row per slide, after their tab row
Col 1 → Desktop image (shown from 992px)
Col 2 → Mobile image (shown below 992px; falls back to the desktop image)
Col 3 → Link for the slide (optional; the whole image is clickable)
Col 4 → Button label (optional; shows a button bottom right, e.g. "View Collection")

Slides of the active tab move with arrows on desktop and swipe + dots on mobile,
and wrap around from the last slide to the first (like the AEM slider).
*/

import { createOptimizedPicture } from '../../scripts/aem.js';
import { trackEvent } from '../../scripts/analytics_1.js';

const MOBILE_MEDIA = '(max-width: 991px)';

let blockCount = 0;

function text(el) {
  return (el?.textContent || '').trim();
}

function parse(block) {
  const tabs = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (text(cells[0]).toLowerCase() === 'tab' && !row.querySelector('img')) {
      tabs.push({ title: text(cells[1]), slides: [] });
      return;
    }
    const desktop = cells[0]?.querySelector('img');
    if (!desktop) return;
    if (!tabs.length) tabs.push({ title: '', slides: [] });
    tabs[tabs.length - 1].slides.push({
      desktop,
      mobile: cells[1]?.querySelector('img'),
      href: cells[2]?.querySelector('a[href]')?.getAttribute('href') || '',
      label: text(cells[3]),
    });
  });
  return tabs.filter((tab) => tab.slides.length);
}

function buildPicture(slide) {
  const alt = slide.desktop.alt || '';
  const picture = createOptimizedPicture(slide.desktop.src, alt, false, [{ width: '2000' }]);
  if (slide.mobile && slide.mobile.src !== slide.desktop.src) {
    const mobile = createOptimizedPicture(slide.mobile.src, alt, false, [{ width: '750' }]);
    const webp = mobile.querySelector('source[type="image/webp"]');
    if (webp) {
      webp.media = MOBILE_MEDIA;
      picture.prepend(webp);
    }
  }
  return picture;
}

function buildSlide(slide, index, count) {
  const el = document.createElement('div');
  el.className = 'tabs-image-carousel-slide';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-roledescription', 'slide');
  el.setAttribute('aria-label', `${index + 1} of ${count}`);

  const media = document.createElement(slide.href ? 'a' : 'div');
  media.className = 'tabs-image-carousel-media';
  if (slide.href) media.href = slide.href;
  media.append(buildPicture(slide));
  el.append(media);

  if (slide.label && slide.href) {
    const cta = document.createElement('a');
    cta.className = 'tabs-image-carousel-cta';
    cta.href = slide.href;
    cta.textContent = slide.label;
    const arrow = document.createElement('span');
    arrow.className = 'tabs-image-carousel-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    cta.append(arrow);
    el.append(cta);
  }
  return el;
}

// one slider per tab: arrows, dots, swipe; wraps around at both ends
function buildSlider(tab) {
  const slider = document.createElement('div');
  slider.className = 'tabs-image-carousel-slider';

  const viewport = document.createElement('div');
  viewport.className = 'tabs-image-carousel-viewport';
  const track = document.createElement('div');
  track.className = 'tabs-image-carousel-track';
  const slides = tab.slides.map((s, i) => buildSlide(s, i, tab.slides.length));
  track.append(...slides);
  viewport.append(track);
  slider.append(viewport);

  let current = 0;
  const dots = [];
  const goTo = (index, animate = true) => {
    current = (index + slides.length) % slides.length;
    track.classList.toggle('no-animation', !animate);
    track.style.transform = `translateX(-${current * 100}%)`;
    slides.forEach((s, i) => {
      s.inert = i !== current;
      s.setAttribute('aria-hidden', i !== current);
    });
    dots.forEach((d, i) => d.setAttribute('aria-current', i === current));
  };

  if (slides.length > 1) {
    const arrow = (dir, label, step) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `tabs-image-carousel-${dir}`;
      button.setAttribute('aria-label', label);
      button.addEventListener('click', () => goTo(current + step));
      return button;
    };
    slider.append(arrow('prev', 'Previous slide', -1), arrow('next', 'Next slide', 1));

    const dotList = document.createElement('div');
    dotList.className = 'tabs-image-carousel-dots';
    slides.forEach((s, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'tabs-image-carousel-dot';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dots.push(dot);
      dotList.append(dot);
    });
    slider.append(dotList);

    // swipe / drag
    let startX = null;
    let moved = false;
    viewport.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      moved = false;
    });
    viewport.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const delta = e.clientX - startX;
      startX = null;
      if (Math.abs(delta) > 40) {
        moved = true;
        goTo(current + (delta < 0 ? 1 : -1));
      }
    });
    viewport.addEventListener('pointercancel', () => { startX = null; });
    // a swipe should not open the slide link
    viewport.addEventListener('click', (e) => {
      if (moved) {
        e.preventDefault();
        moved = false;
      }
    }, true);
    viewport.addEventListener('dragstart', (e) => e.preventDefault());
  }

  goTo(0, false);
  return { slider, reset: () => goTo(0, false) };
}

export default function decorate(block) {
  const tabs = parse(block);
  if (!tabs.length) return;

  blockCount += 1;
  const id = `tabs-image-carousel-${blockCount}`;

  const tabList = document.createElement('div');
  tabList.className = 'tabs-image-carousel-tabs';
  tabList.setAttribute('role', 'tablist');

  const buttons = [];
  const panels = [];
  const sliders = [];
  let active = 0;

  const activate = (index, focus = false) => {
    active = index;
    buttons.forEach((b, i) => {
      b.setAttribute('aria-selected', i === index);
      b.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    sliders[index].reset();
    if (focus) buttons[index].focus();
  };

  tabs.forEach((tab, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tabs-image-carousel-tab';
    button.id = `${id}-tab-${i}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `${id}-panel-${i}`);
    button.textContent = tab.title;
    button.addEventListener('click', () => {
      if (i !== active) activate(i);
      // same analytics as the AEM component
      trackEvent('filter_click', { filter: tab.title });
    });
    buttons.push(button);
    tabList.append(button);

    const panel = document.createElement('div');
    panel.className = 'tabs-image-carousel-panel';
    panel.id = `${id}-panel-${i}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    const { slider, reset } = buildSlider(tab);
    panel.append(slider);
    panels.push(panel);
    sliders.push({ reset });
  });

  tabList.addEventListener('keydown', (e) => {
    const last = buttons.length - 1;
    const keys = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    activate(keys[e.key], true);
  });

  if (tabs.length === 1 && !tabs[0].title) tabList.hidden = true;

  block.replaceChildren(tabList, ...panels);
  activate(0);
}
