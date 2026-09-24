import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * loads and decorates the location-cards block
 * @param {Element} block The location-cards block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((div) => {
      // an image cell contains only an image (picture or img), no visible text
      if (div.querySelector('picture, img') && div.textContent.trim() === '') {
        div.className = 'location-cards-image';
      } else {
        div.className = 'location-cards-label';
      }
    });

    // if the card has a link (authored on the label or as a separate cell),
    // make the whole card clickable by wrapping its contents in that anchor
    const link = li.querySelector('a[href]');
    if (link) {
      const href = link.getAttribute('href');
      const label = link.textContent.trim();
      const anchor = document.createElement('a');
      anchor.className = 'location-cards-link';
      anchor.href = href;
      anchor.setAttribute('aria-label', label);
      // move all existing card content inside the anchor
      while (li.firstChild) anchor.append(li.firstChild);
      // replace the inner label anchor with plain text (avoid nested links)
      const innerLink = anchor.querySelector('.location-cards-label a[href]');
      if (innerLink) innerLink.replaceWith(...innerLink.childNodes);
      li.append(anchor);
    }

    ul.append(li);
  });

  // optimize images
  ul.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ width: '500' }]),
    );
  });

  block.replaceChildren(ul);
}
