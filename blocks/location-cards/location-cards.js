import { createOptimizedPicture } from '../../scripts/aem.js';

// below this width the art-directed mobile image (when authored) is used
const MOBILE = '(max-width: 599px)';

/**
 * a cell is an image cell when it holds only an image (no visible text)
 */
function isImageCell(cell) {
  return cell.querySelector('picture, img') && cell.textContent.trim() === '';
}

/**
 * build an AEM-optimized srcset URL for a given image source
 */
function optimizedSrcset(src, width, format) {
  const { pathname } = new URL(src, window.location.href);
  return `${pathname}?width=${width}&format=${format}&optimize=medium`;
}

/**
 * build a responsive <picture>. When a mobile image is provided it is used
 * (art direction) below the mobile breakpoint; otherwise the single desktop
 * image is auto-resized for each breakpoint.
 * @param {HTMLImageElement} desktopImg the primary/desktop image
 * @param {HTMLImageElement} [mobileImg] optional separate image for mobile
 */
function buildPicture(desktopImg, mobileImg) {
  const picture = createOptimizedPicture(desktopImg.src, desktopImg.alt, false, [
    { media: '(min-width: 900px)', width: '500' },
    { media: '(min-width: 600px)', width: '400' },
    { width: '750' },
  ]);

  if (mobileImg && mobileImg.src) {
    const ext = new URL(mobileImg.src, window.location.href).pathname.split('.').pop();
    const webp = document.createElement('source');
    webp.setAttribute('media', MOBILE);
    webp.setAttribute('type', 'image/webp');
    webp.setAttribute('srcset', optimizedSrcset(mobileImg.src, '750', 'webply'));
    const fallback = document.createElement('source');
    fallback.setAttribute('media', MOBILE);
    fallback.setAttribute('srcset', optimizedSrcset(mobileImg.src, '750', ext));
    // prepend so the mobile sources win below the breakpoint
    picture.prepend(fallback);
    picture.prepend(webp);
  }

  return picture;
}

/**
 * loads and decorates the location-cards block
 * @param {Element} block The location-cards block element
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    // an author may provide 1 image (auto-resized) or 2 images (desktop + mobile)
    const imageCells = cells.filter(isImageCell);
    const labelCell = cells.find((c) => !isImageCell(c));

    const li = document.createElement('li');

    if (imageCells.length) {
      const desktopImg = imageCells[0].querySelector('img');
      const mobileImg = imageCells[1] ? imageCells[1].querySelector('img') : null;
      const imageDiv = document.createElement('div');
      imageDiv.className = 'location-cards-image';
      if (desktopImg) imageDiv.append(buildPicture(desktopImg, mobileImg));
      li.append(imageDiv);
    }

    if (labelCell) {
      labelCell.className = 'location-cards-label';
      li.append(labelCell);
    }

    // if the card has a link, make the whole card clickable
    const link = li.querySelector('a[href]');
    if (link) {
      const href = link.getAttribute('href');
      const label = link.textContent.trim();
      const anchor = document.createElement('a');
      anchor.className = 'location-cards-link';
      anchor.href = href;
      anchor.setAttribute('aria-label', label);
      while (li.firstChild) anchor.append(li.firstChild);
      // replace the inner label anchor with plain text (avoid nested links)
      const innerLink = anchor.querySelector('.location-cards-label a[href]');
      if (innerLink) innerLink.replaceWith(...innerLink.childNodes);
      li.append(anchor);
    }

    ul.append(li);
  });

  block.replaceChildren(ul);
}
