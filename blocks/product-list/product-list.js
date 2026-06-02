export default async function decorate(block) {
  const apiUrl = block.querySelector('a')?.href
    || block.textContent.trim()
    || 'https://fakestoreapi.com/products';

  block.textContent = '';

  const loading = document.createElement('div');
  loading.className = 'product-loading';
  loading.innerHTML = '<div class="spinner"></div><p>Loading products...</p>';
  block.append(loading);

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const products = await response.json();

    block.textContent = '';

    const toolbar = document.createElement('div');
    toolbar.className = 'product-toolbar';
    toolbar.innerHTML = `
      <input type="text" class="product-search" placeholder="Search products...">
      <div class="product-toolbar-right">
        <select class="product-category">
          <option value="all">All Categories</option>
        </select>
        <select class="product-sort">
          <option value="default">Sort by</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
          <option value="rating">Best Rating</option>
          <option value="title">Name A–Z</option>
        </select>
      </div>
    `;

    const count = document.createElement('p');
    count.className = 'product-count';

    const grid = document.createElement('ul');
    grid.className = 'product-grid';

    block.append(toolbar, count, grid);

    const categories = [...new Set(products.map((p) => p.category))];
    const catSelect = toolbar.querySelector('.product-category');
    categories.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      catSelect.append(opt);
    });

    const render = (list) => {
      grid.textContent = '';
      count.textContent = `Showing ${list.length} of ${products.length} products`;

      if (list.length === 0) {
        grid.innerHTML = '<li class="product-empty">No products found. Try a different search.</li>';
        return;
      }

      list.forEach((product) => {
        const stars = Math.round(product.rating?.rate || 0);
        const li = document.createElement('li');
        li.className = 'product-card';
        li.innerHTML = `
          <div class="product-card-image">
            <img src="${product.image}" alt="${product.title}" loading="lazy">
          </div>
          <div class="product-card-body">
            <span class="product-card-category">${product.category}</span>
            <h3 class="product-card-title">${product.title}</h3>
            <p class="product-card-desc">${product.description.substring(0, 100)}...</p>
            <div class="product-card-rating">
              <span class="stars">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</span>
              <span class="review-count">${product.rating?.rate || 0} (${product.rating?.count || 0} reviews)</span>
            </div>
            <div class="product-card-bottom">
              <span class="product-card-price">$${product.price.toFixed(2)}</span>
              <button class="product-card-btn">Add to Cart</button>
            </div>
          </div>
        `;

        const btn = li.querySelector('.product-card-btn');
        btn.addEventListener('click', () => {
          btn.textContent = '✓ Added!';
          btn.classList.add('added');
          setTimeout(() => {
            btn.textContent = 'Add to Cart';
            btn.classList.remove('added');
          }, 1500);
        });

        grid.append(li);
      });
    };

    const applyFilters = () => {
      const query = toolbar.querySelector('.product-search').value.toLowerCase();
      const cat = toolbar.querySelector('.product-category').value;
      const sort = toolbar.querySelector('.product-sort').value;

      const filtered = products.filter((p) => {
        const matchText = p.title.toLowerCase().includes(query)
          || p.category.toLowerCase().includes(query);
        const matchCat = cat === 'all' || p.category === cat;
        return matchText && matchCat;
      });

      if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
      else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
      else if (sort === 'rating') filtered.sort((a, b) => b.rating.rate - a.rating.rate);
      else if (sort === 'title') filtered.sort((a, b) => a.title.localeCompare(b.title));

      render(filtered);
    };

    toolbar.querySelector('.product-search').addEventListener('input', applyFilters);
    toolbar.querySelector('.product-category').addEventListener('change', applyFilters);
    toolbar.querySelector('.product-sort').addEventListener('change', applyFilters);

    render(products);
  } catch (error) {
    block.textContent = '';
    block.innerHTML = `<div class="product-error"><p>Unable to load products.</p><p>${error.message}</p></div>`;
  }
}
