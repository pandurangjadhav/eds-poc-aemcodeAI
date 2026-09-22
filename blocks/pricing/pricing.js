/**
 * loads and decorates the pricing block
 * @param {Element} block The pricing block element
 */
export default function decorate(block) {
  const rows = [...block.children];

  const intro = document.createElement('div');
  intro.className = 'pricing-intro';

  const plans = document.createElement('div');
  plans.className = 'pricing-plans';

  rows.forEach((row) => {
    const cells = [...row.children];

    // A row with a single cell is the intro column (heading + description)
    if (cells.length <= 1) {
      if (cells[0]) intro.append(...cells[0].childNodes);
      return;
    }

    // Otherwise the row describes a single plan: name, features, cta
    const [name, features, cta] = cells;
    const card = document.createElement('div');
    card.className = 'pricing-plan';

    if (name) {
      name.className = 'pricing-plan-name';
      // promote plain text plan names to a heading for hierarchy/a11y
      if (!name.querySelector('h1,h2,h3,h4,h5,h6')) {
        const heading = document.createElement('h3');
        heading.append(...name.childNodes);
        name.append(heading);
      }
      card.append(name);
    }

    if (features) {
      features.className = 'pricing-plan-features';
      card.append(features);
    }

    if (cta) {
      cta.className = 'pricing-plan-cta';
      const link = cta.querySelector('a');
      if (link) {
        link.classList.add('button', 'pricing-plan-button');
      }
      card.append(cta);
    }

    plans.append(card);
  });

  block.replaceChildren(intro, plans);
}
