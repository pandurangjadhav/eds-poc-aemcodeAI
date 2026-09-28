// labelled option rows: "Heading | text" and "Sub heading | text"
const OPTIONS = {
  heading: 'heading',
  subheading: 'subheading',
};

/**
 * @param {Element[]} cells the cells of a row
 * @returns {string|null} the option a two-cell row sets, if any
 */
function optionName(cells) {
  if (cells.length !== 2) return null;
  const label = cells[0].textContent.trim().toLowerCase().replace(/[\s:_-]/g, '');
  return OPTIONS[label] || null;
}

/**
 * loads and decorates the choose-plan block
 * @param {Element} block The choose-plan block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  const intro = document.createElement('div');
  intro.className = 'choose-plan-intro';

  const plans = document.createElement('div');
  plans.className = 'choose-plan-plans';

  rows.forEach((row) => {
    const cells = [...row.children];

    // "Heading" and "Sub heading" option rows
    const option = optionName(cells);
    if (option) {
      const text = cells[1].textContent.trim();
      if (text) {
        const el = document.createElement(option === 'heading' ? 'h2' : 'p');
        el.className = `choose-plan-${option}`;
        el.textContent = text;
        intro.append(el);
      }
      return;
    }

    // A row with a single cell is the intro (heading + description)
    if (cells.length <= 1) {
      if (cells[0]) intro.append(...cells[0].childNodes);
      return;
    }

    // Otherwise the row describes a single plan: name, features, cta
    const [name, features, cta] = cells;
    const card = document.createElement('div');
    card.className = 'choose-plan-plan';

    if (name) {
      name.className = 'choose-plan-name';
      // promote plain text plan names to a heading for hierarchy/a11y
      if (!name.querySelector('h1,h2,h3,h4,h5,h6')) {
        const heading = document.createElement('h3');
        heading.append(...name.childNodes);
        name.append(heading);
      }
      card.append(name);
    }

    if (features) {
      features.className = 'choose-plan-features';
      card.append(features);
    }

    if (cta) {
      cta.className = 'choose-plan-cta';
      const link = cta.querySelector('a');
      if (link) {
        link.classList.add('button', 'choose-plan-button');
      }
      card.append(cta);
    }

    plans.append(card);
  });

  // keep the heading above the sub heading whatever order the rows were authored in
  const heading = intro.querySelector(':scope > .choose-plan-heading');
  if (heading) intro.prepend(heading);

  block.replaceChildren(...(intro.childNodes.length ? [intro] : []), plans);
}
