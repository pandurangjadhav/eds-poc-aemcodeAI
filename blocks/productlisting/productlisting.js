/*
** Authoring format **

Block name: Productlisting

Two-column rows: label | value
Source       → link to the products sheet, e.g. /wood-listing-products.json
Filters      → sheet columns shown as filter groups, in order,
               e.g. "Product Type, Range, Finish, Category"
Disclaimer   → text shown above the products (a leading * is shown in red)
Button Label → CTA label on every card (default "View Product")
<group name> → optional, option order for that filter group, e.g. "Range | italian luxury, premium"

Products sheet columns
Code, Name, Description, Image, Key Features (separated by |), Price, Unit (e.g. "per L"), Link,
plus one column per filter group with comma separated values (e.g. Finish: "matt, high gloss").

Filters work like the live AEM listing: options in one group are OR'ed, groups are AND'ed,
options no shown product has are disabled, and the selection is kept in the URL as
?f=range:italian luxury,premium&category:clear with the group names as authored in "Filters"
(links from other pages can preselect filters).
*/

import { createOptimizedPicture } from '../../scripts/aem.js';
import { trackEvent } from '../../scripts/analytics_1.js';

const DESKTOP = window.matchMedia('(min-width: 992px)');

function text(el) {
  return (el?.textContent || '').trim();
}

function norm(value) {
  return (value || '').toString().trim().toLowerCase();
}

function list(value, separator = ',') {
  return (value || '').split(separator).map((v) => v.trim()).filter(Boolean);
}

function readConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const [label, value] = [...row.children];
    const key = norm(text(label)).replace(/[^a-z]+/g, ' ').trim();
    if (!key || !value) return;
    config[key] = value.querySelector('a[href]')?.getAttribute('href') || text(value);
  });
  return config;
}

// ?f=range:italian luxury,premium&category:clear (the whole rest of the URL after f=)
function readUrlFilters() {
  const { href } = window.location;
  const at = href.search(/[?&]f=/);
  if (at === -1) return {};
  let raw = href.slice(at + 3).split('#')[0];
  try {
    raw = decodeURIComponent(raw.replace(/\+/g, ' '));
  } catch (e) {
    // keep the raw value
  }
  const selected = {};
  raw.split('&').forEach((part) => {
    const [key, values] = part.split(':');
    if (key && values) selected[norm(key)] = list(values).map(norm);
  });
  return selected;
}

function writeUrlFilters(groups, selected) {
  const parts = groups
    .filter((g) => selected[g.key].size)
    .map((g) => `${g.label}:${[...selected[g.key]].join(',')}`);
  const url = new URL(window.location.href);
  url.search = url.search.replace(/[?&]f=.*$/, '');
  const base = `${url.pathname}${url.search}`;
  const query = parts.length ? `${url.search ? '&' : '?'}f=${encodeURIComponent(parts.join('&'))}` : '';
  window.history.replaceState(null, '', `${base}${query}${url.hash}`);
}

function buildCard(product, buttonLabel, eager) {
  const li = document.createElement('li');
  li.className = 'productlisting-card';

  const imageWrap = document.createElement('div');
  imageWrap.className = 'productlisting-card-image';
  if (product.image) {
    imageWrap.append(createOptimizedPicture(product.image, product.name, eager, [{ width: '500' }]));
  }

  const body = document.createElement('div');
  body.className = 'productlisting-card-body';

  const title = document.createElement('h3');
  title.className = 'productlisting-card-title';
  title.textContent = product.name;

  const info = document.createElement('div');
  info.className = 'productlisting-card-info';
  if (product.description) {
    const desc = document.createElement('p');
    desc.className = 'productlisting-card-description';
    desc.textContent = product.description;
    info.append(desc);
  }
  if (product.features.length) {
    const features = document.createElement('div');
    features.className = 'productlisting-card-features';
    const label = document.createElement('span');
    label.textContent = 'Key Features';
    const ul = document.createElement('ul');
    product.features.forEach((feature) => {
      const item = document.createElement('li');
      item.textContent = feature;
      ul.append(item);
    });
    features.append(label, ul);
    info.append(features);
  }

  const bottom = document.createElement('div');
  bottom.className = 'productlisting-card-bottom';
  if (product.price) {
    const price = document.createElement('div');
    price.className = 'productlisting-card-price';
    price.innerHTML = '<p class="productlisting-card-mrp">MRP <span class="productlisting-card-symbol">₹</span><span class="productlisting-card-value"></span></p>'
      + '<p class="productlisting-card-tax">(Inclusive of all taxes) <span class="productlisting-card-unit"></span><span class="productlisting-card-star">*</span></p>';
    price.querySelector('.productlisting-card-value').textContent = product.price;
    price.querySelector('.productlisting-card-unit').textContent = product.unit;
    bottom.append(price);
  }
  if (product.link) {
    const cta = document.createElement('a');
    cta.className = 'productlisting-card-cta';
    cta.href = product.link;
    cta.textContent = buttonLabel;
    cta.setAttribute('aria-label', `${buttonLabel}: ${product.name}`);
    cta.addEventListener('click', () => {
      trackEvent('custom_cta_click', {
        cta_: buttonLabel,
        redirectionLink: new URL(product.link, window.location.origin).href,
        parentTitle: product.name,
      });
    });
    bottom.append(cta);
  }

  body.append(title, info, bottom);
  li.append(imageWrap, body);
  return li;
}

function buildFilters(groups, onToggle) {
  const pane = document.createElement('div');
  pane.className = 'productlisting-filters';

  const head = document.createElement('div');
  head.className = 'productlisting-filters-head';
  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.className = 'productlisting-filters-toggle';
  openButton.textContent = 'Filter by';
  openButton.setAttribute('aria-expanded', 'false');
  head.append(openButton);

  const panel = document.createElement('div');
  panel.className = 'productlisting-filters-panel';
  panel.id = `productlisting-filters-${Math.random().toString(36).slice(2, 8)}`;
  openButton.setAttribute('aria-controls', panel.id);

  const form = document.createElement('form');
  form.className = 'productlisting-filters-groups';
  form.addEventListener('submit', (e) => e.preventDefault());

  groups.forEach((group) => {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'productlisting-group is-open';
    const legend = document.createElement('legend');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'productlisting-group-toggle';
    toggle.textContent = group.label;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.addEventListener('click', () => {
      const open = fieldset.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open);
    });
    legend.append(toggle);
    const options = document.createElement('div');
    options.className = 'productlisting-group-options';
    group.values.forEach((value) => {
      const label = document.createElement('label');
      label.className = 'productlisting-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = value;
      input.dataset.group = group.key;
      input.addEventListener('change', () => onToggle(group.key, value, input.checked));
      const name = document.createElement('span');
      name.className = 'productlisting-option-name';
      name.textContent = value;
      label.append(input, name);
      options.append(label);
    });
    fieldset.append(legend, options);
    form.append(fieldset);
  });

  const actions = document.createElement('div');
  actions.className = 'productlisting-filters-actions';
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'productlisting-clear';
  clear.textContent = 'Clear all';
  const apply = document.createElement('button');
  apply.type = 'button';
  apply.className = 'productlisting-apply';
  apply.textContent = 'Apply';
  actions.append(clear, apply);

  head.append(clear.cloneNode(true));
  panel.append(form, actions);
  pane.append(head, panel);
  return {
    pane, panel, form, openButton, clearButtons: [head.lastElementChild, clear], apply,
  };
}

export default async function decorate(block) {
  const config = readConfig(block);
  const { source } = config;
  block.textContent = '';
  if (!source) return;

  let rows = [];
  try {
    const resp = await fetch(source);
    if (resp.ok) rows = (await resp.json()).data || [];
  } catch (e) {
    rows = [];
  }

  const groupNames = list(config.filters || 'Product Type, Range, Finish, Category');
  const buttonLabel = config['button label'] || 'View Product';

  const products = rows.map((row) => {
    const columns = {};
    Object.keys(row).forEach((col) => { columns[norm(col)] = row[col]; });
    const tags = {};
    groupNames.forEach((name) => {
      tags[norm(name)] = list(columns[norm(name)]).map(norm);
    });
    return {
      name: row.Name || '',
      description: row.Description || '',
      image: row.Image || '',
      features: list(row['Key Features'], '|'),
      price: row.Price || '',
      unit: row.Unit || '',
      link: row.Link || '',
      tags,
    };
  }).filter((p) => p.name);

  // filter groups; options in the order given by a row named after the group, then sheet order
  const groups = groupNames.map((label) => {
    const key = norm(label);
    const values = list(config[key]).map(norm)
      .filter((v) => products.some((p) => p.tags[key].includes(v)));
    products.forEach((p) => p.tags[key].forEach((v) => {
      if (!values.includes(v)) values.push(v);
    }));
    return { key, label, values };
  }).filter((g) => g.values.length);

  const selected = {};
  const fromUrl = readUrlFilters();
  groups.forEach((g) => {
    selected[g.key] = new Set((fromUrl[g.key] || []).filter((v) => g.values.includes(v)));
  });

  const matches = (product, extra) => groups.every((g) => {
    const chosen = selected[g.key];
    if (extra && extra.key === g.key && !product.tags[g.key].includes(extra.value)) return false;
    return !chosen.size || product.tags[g.key].some((v) => chosen.has(v));
  });

  // layout
  const container = document.createElement('div');
  container.className = 'productlisting-container';
  // same analytics as the AEM listing: filter_click with "group : a|b || group : c"
  const trackFilters = () => {
    const filter = groups
      .filter((g) => selected[g.key].size)
      .map((g) => `${g.label} : ${[...selected[g.key]].join('|')}`)
      .join(' || ');
    trackEvent('filter_click', { filter });
  };

  const filters = buildFilters(groups, (key, value, checked) => {
    if (checked) selected[key].add(value);
    else selected[key].delete(value);
    // eslint-disable-next-line no-use-before-define
    render();
    trackFilters();
  });

  const results = document.createElement('div');
  results.className = 'productlisting-results';
  if (config.disclaimer) {
    const disclaimer = document.createElement('p');
    disclaimer.className = 'productlisting-disclaimer';
    const star = config.disclaimer.startsWith('*');
    disclaimer.innerHTML = star ? '<span class="productlisting-card-star">*</span>' : '';
    disclaimer.append(star ? config.disclaimer.slice(1) : config.disclaimer);
    results.append(disclaimer);
  }
  const grid = document.createElement('ul');
  grid.className = 'productlisting-grid';
  const empty = document.createElement('p');
  empty.className = 'productlisting-empty';
  empty.textContent = 'No products match the selected filters.';
  empty.hidden = true;
  results.append(grid, empty);

  const cards = products.map((p, i) => buildCard(p, buttonLabel, i < 2));
  grid.append(...cards);

  const inputs = [...filters.form.querySelectorAll('input')];

  function render() {
    let visible = 0;
    products.forEach((p, i) => {
      const show = matches(p);
      cards[i].hidden = !show;
      if (show) visible += 1;
    });
    empty.hidden = visible > 0;
    inputs.forEach((input) => {
      const { group } = input.dataset;
      input.checked = selected[group].has(input.value);
      // an option is off when no shown product has it; checked options stay on so they
      // can be unticked, and with no results everything is on again
      const possible = !visible || input.checked
        || products.some((p) => matches(p, { key: group, value: input.value }));
      input.disabled = !possible;
      input.closest('label').classList.toggle('is-disabled', !possible);
    });
    writeUrlFilters(groups, selected);
  }

  const setOpen = (open) => {
    filters.pane.classList.toggle('is-open', open);
    filters.openButton.setAttribute('aria-expanded', open);
    document.body.classList.toggle('productlisting-modal-open', open && !DESKTOP.matches);
  };
  filters.openButton.addEventListener('click', () => {
    if (!DESKTOP.matches) setOpen(!filters.pane.classList.contains('is-open'));
  });
  filters.apply.addEventListener('click', () => setOpen(false));
  filters.clearButtons.forEach((button) => button.addEventListener('click', () => {
    groups.forEach((g) => selected[g.key].clear());
    render();
    setOpen(false);
  }));
  filters.pane.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && filters.pane.classList.contains('is-open')) {
      setOpen(false);
      filters.openButton.focus();
    }
  });
  DESKTOP.addEventListener('change', () => {
    setOpen(false);
    render();
  });

  container.append(filters.pane, results);
  block.append(container);
  render();
}
