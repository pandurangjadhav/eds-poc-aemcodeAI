/*
 * Analytics helpers used by blocks shared with the Asian Paints EDS site
 * (same function names as that site's scripts/analytics_1.js).
 * Events go to Adobe Launch and the Adobe data layer when they are on the page;
 * without them the calls do nothing, so blocks never break.
 */

/* eslint-disable no-underscore-dangle */
export function trackEvent(eventName, eventData = {}) {
  try {
    if (window._satellite && typeof window._satellite.track === 'function') {
      window._satellite.track(eventName, eventData);
    }
  } catch (e) {
    // analytics must never break the page
  }
  if (Array.isArray(window.adobeDataLayer)) {
    window.adobeDataLayer.push({ event: eventName, eventInfo: eventData });
  }
}
/* eslint-enable no-underscore-dangle */

/**
 * tracks clicks on the previous / next arrows of a carousel
 * @param {Element} rootEl the block (or carousel) element
 * @param {string} title the carousel title sent with the event
 */
export function bindCarouselNavigationTracking(rootEl, title) {
  if (!rootEl) return;
  rootEl.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button || !rootEl.contains(button)) return;
    const label = button.getAttribute('aria-label') || '';
    if (!/^(previous|next)/i.test(label)) return;
    trackEvent('carousel_navigation', { ctaName: label, Title: title || '' });
  });
}

/**
 * pushes a product / tile title click to the Adobe data layer
 * @param {{ productName?: string, title?: string, destinationUrl?: string, event?: string }} config
 */
export function pushAdobeProductTitleClick(config = {}) {
  if (!Array.isArray(window.adobeDataLayer)) return;
  window.adobeDataLayer.push({
    event: config.event || 'product_tile_click',
    eventInfo: {
      productName: config.productName || '',
      title: config.title || '',
      destinationUrl: config.destinationUrl || '',
    },
  });
}
