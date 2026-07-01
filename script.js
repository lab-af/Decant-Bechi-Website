/* =========================================================
   1. CONFIG — edit these to fit your business
========================================================= */

// Your Facebook Page username
const FB_PAGE_USERNAME = "decantbechilabaf";

// Delivery charges (BDT)
const DELIVERY_CHARGE = {
  inside: 80,
  outside: 130
};

// Google Sheets API URL (your Sheet.best endpoint)
const SHEET_API_URL = "https://api.sheetbest.com/sheets/213d7098-d0eb-454a-b492-0ff5ed0f43fc";

/* =========================================================
   2. PRODUCT DATA — loaded from Google Sheets
========================================================= */
let PRODUCTS = [];

async function loadProducts() {
  try {
    // Show loading state
    document.getElementById('productGrid').innerHTML = 
      '<p style="text-align:center;padding:40px;">⏳ Loading perfumes...</p>';
    
    const response = await fetch(SHEET_API_URL);
    
    if (!response.ok) throw new Error('Failed to load products');
    
    const data = await response.json();
    
    // Convert sheet data to product format
    PRODUCTS = data.map((row, index) => {
      // Parse sizes from string like "2:350,5:750,10:1400,30:3600"
      const sizeParts = row.sizes.split(',');
      const sizes = sizeParts.map(part => {
        const [ml, price] = part.split(':');
        // Check if there's a sale price (e.g., "320/260")
        if (price.includes('/')) {
          const [regular, sale] = price.split('/');
          return { ml: parseInt(ml), price: parseInt(regular), salePrice: parseInt(sale) };
        }
        return { ml: parseInt(ml), price: parseInt(price) };
      });
      
      return {
        id: row.id || `p${index + 1}`,
        name: row.name,
        brand: row.brand,
        gender: row.gender,
        notes: row.notes,
        status: row.status || 'available', // available or out
        sizes: sizes
      };
    });
    
    // Render everything
    renderGrid();
    renderCart();
    
  } catch (error) {
    console.error('Error loading products:', error);
    document.getElementById('productGrid').innerHTML = 
      '<p style="text-align:center;padding:40px;">⚠️ Unable to load products. Please refresh or try again later.</p>';
  }
}

/* =========================================================
   3. STATE
========================================================= */
let cart = loadCart();
let searchTerm = "";
let toastTimeout = null;

/* =========================================================
   4. DOM REFS
========================================================= */
const productGrid   = document.getElementById("productGrid");
const emptyState    = document.getElementById("emptyState");
const cartCountEl   = document.getElementById("cartCount");
const cartItemsEl   = document.getElementById("cartItems");
const cartEmptyMsg  = document.getElementById("cartEmptyMsg");
const subtotalVal   = document.getElementById("subtotalVal");
const deliveryVal   = document.getElementById("deliveryVal");
const totalVal      = document.getElementById("totalVal");
const cartDrawer    = document.getElementById("cartDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");

// Toast elements
const toast         = document.getElementById("toast");
const toastMessage  = document.getElementById("toastMessage");

// Customer details inputs
const custName    = document.getElementById("custName");
const custPhone   = document.getElementById("custPhone");
const custAddress = document.getElementById("custAddress");

document.getElementById("insidePriceLabel").textContent = `৳${DELIVERY_CHARGE.inside}`;
document.getElementById("outsidePriceLabel").textContent = `৳${DELIVERY_CHARGE.outside}`;

/* =========================================================
   4.5 PHONE VALIDATION — only numbers, exactly 11 digits
========================================================= */
custPhone.addEventListener("input", function(e) {
  // Remove any non-digit characters
  this.value = this.value.replace(/\D/g, '');
  
  // Limit to 11 digits
  if (this.value.length > 11) {
    this.value = this.value.slice(0, 11);
  }
});

// Also validate on blur (when user leaves the field)
custPhone.addEventListener("blur", function() {
  if (this.value.length > 0 && this.value.length !== 11) {
    this.style.borderColor = "#B85A36";
    this.style.boxShadow = "0 0 0 3px rgba(184, 90, 54, 0.2)";
  } else {
    this.style.borderColor = "";
    this.style.boxShadow = "";
  }
});

// Remove error styling when user starts typing again
custPhone.addEventListener("focus", function() {
  this.style.borderColor = "";
  this.style.boxShadow = "";
});

/* =========================================================
   4.6 TOAST NOTIFICATION
========================================================= */
function showToast(productName, ml) {
  // Set the message
  toastMessage.innerHTML = `<span class="toast-product-name">${productName}</span> — ${ml}ml added to cart!`;
  
  // Show the toast
  toast.classList.add("show");
  
  // Clear any existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  
  // Auto-hide after 2.5 seconds
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================================================
   5. RENDER PRODUCT GRID
========================================================= */
function renderGrid(){
  const filtered = PRODUCTS.filter(p => {
    if (searchTerm){
      const hay = (p.name + " " + p.brand).toLowerCase();
      if (!hay.includes(searchTerm)) return false;
    }
    return true;
  });

  emptyState.hidden = filtered.length !== 0;
  productGrid.innerHTML = filtered.map(cardHTML).join("");

  // wire up size buttons
  productGrid.querySelectorAll(".size-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      const { productId, ml } = btn.dataset;
      addToCart(productId, Number(ml));
    });
  });
}

function cardHTML(p){
  const isOut = p.status === "out";
  const maxMl = Math.max(...p.sizes.map(s => s.ml));

  const sizesHTML = p.sizes.map(s => {
    const fillPct = Math.round((s.ml / maxMl) * 100);
    const hasSale = s.salePrice != null;
    const priceHTML = hasSale
      ? `<span class="strike">৳${s.price}</span><span class="now">৳${s.salePrice}</span>`
      : `<span>৳${s.price}</span>`;
    return `
      <button class="size-btn" data-product-id="${p.id}" data-ml="${s.ml}" ${isOut ? "disabled" : ""}>
        <div class="vial"><div class="vial-fill" style="height:${fillPct}%"></div></div>
        <span class="size-ml">${s.ml}ml</span>
        <span class="size-price">${priceHTML}</span>
      </button>`;
  }).join("");

  // ONLY TWO BADGES: Available or Out of Stock
  const badge = isOut
    ? `<span class="status-badge out">Out of Stock</span>`
    : `<span class="status-badge available">Available</span>`;

  return `
    <article class="p-card ${isOut ? "out-of-stock" : ""}">
      <div class="p-card-top">
        <div>
          <p class="p-brand">${p.brand}</p>
          <h3 class="p-name">${p.name}</h3>
          <p class="p-notes">${p.notes}</p>
        </div>
        ${badge}
      </div>
      <div class="size-row">${sizesHTML}</div>
    </article>`;
}

/* =========================================================
   6. CART LOGIC
========================================================= */
function cartKey(productId, ml){ return `${productId}|${ml}`; }

function addToCart(productId, ml){
  const product = PRODUCTS.find(p => p.id === productId);
  const size = product.sizes.find(s => s.ml === ml);
  const key = cartKey(productId, ml);

  if (cart[key]){
    cart[key].qty += 1;
  } else {
    cart[key] = { productId, ml, qty: 1 };
  }
  saveCart();
  renderCart();
  
  // Show toast notification
  showToast(product.name, ml);
  
  // Cart no longer opens automatically
}

function changeQty(key, delta){
  if (!cart[key]) return;
  cart[key].qty += delta;
  if (cart[key].qty <= 0) delete cart[key];
  saveCart();
  renderCart();
}

function removeFromCart(key){
  delete cart[key];
  saveCart();
  renderCart();
}

function getUnitPrice(product, size){
  return size.salePrice != null ? size.salePrice : size.price;
}

function renderCart(){
  const keys = Object.keys(cart);
  const totalQty = keys.reduce((sum, k) => sum + cart[k].qty, 0);
  cartCountEl.textContent = totalQty;

  cartEmptyMsg.hidden = keys.length !== 0;

  cartItemsEl.innerHTML = keys.map(key => {
    const entry = cart[key];
    const product = PRODUCTS.find(p => p.id === entry.productId);
    const size = product.sizes.find(s => s.ml === entry.ml);
    const unitPrice = getUnitPrice(product, size);
    const lineTotal = unitPrice * entry.qty;

    return `
      <div class="cart-item">
        <div class="cart-item-info">
          <p class="ci-name">${product.name}</p>
          <p class="ci-size">${entry.ml}ml · ৳${unitPrice} each</p>
        </div>
        <div class="cart-item-right">
          <span class="ci-price">৳${lineTotal}</span>
          <div class="qty-stepper">
            <button data-action="dec" data-key="${key}">−</button>
            <span>${entry.qty}</span>
            <button data-action="inc" data-key="${key}">+</button>
          </div>
          <button class="ci-remove" data-action="remove" data-key="${key}">Remove</button>
        </div>
      </div>`;
  }).join("");

  cartItemsEl.querySelectorAll("button[data-action]").forEach(btn => {
    const key = btn.dataset.key;
    const action = btn.dataset.action;
    btn.addEventListener("click", () => {
      if (action === "inc") changeQty(key, 1);
      if (action === "dec") changeQty(key, -1);
      if (action === "remove") removeFromCart(key);
    });
  });

  renderTotals();
}

function getSubtotal(){
  return Object.keys(cart).reduce((sum, key) => {
    const entry = cart[key];
    const product = PRODUCTS.find(p => p.id === entry.productId);
    const size = product.sizes.find(s => s.ml === entry.ml);
    return sum + getUnitPrice(product, size) * entry.qty;
  }, 0);
}

function getDeliveryMethod(){
  return document.querySelector('input[name="delivery"]:checked').value;
}

function renderTotals(){
  const subtotal = getSubtotal();
  const hasItems = Object.keys(cart).length > 0;
  const delivery = hasItems ? DELIVERY_CHARGE[getDeliveryMethod()] : 0;
  const total = subtotal + delivery;

  subtotalVal.textContent = `৳${subtotal}`;
  deliveryVal.textContent = `৳${delivery}`;
  totalVal.textContent = `৳${total}`;
}

document.querySelectorAll('input[name="delivery"]').forEach(radio => {
  radio.addEventListener("change", renderTotals);
});

/* =========================================================
   7. PERSISTENCE (localStorage)
========================================================= */
function saveCart(){
  localStorage.setItem("fragranza_cart", JSON.stringify(cart));
}
function loadCart(){
  try {
    return JSON.parse(localStorage.getItem("fragranza_cart")) || {};
  } catch {
    return {};
  }
}

/* =========================================================
   8. DRAWER OPEN/CLOSE
========================================================= */
function openDrawer(){
  cartDrawer.classList.add("open");
  drawerOverlay.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}
function closeDrawer(){
  cartDrawer.classList.remove("open");
  drawerOverlay.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}
document.getElementById("cartToggleBtn").addEventListener("click", openDrawer);
document.getElementById("drawerCloseBtn").addEventListener("click", closeDrawer);
drawerOverlay.addEventListener("click", closeDrawer);

/* =========================================================
   9. SEARCH BINDING
========================================================= */

// Search input
document.getElementById("searchInput").addEventListener("input", (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderGrid();
});

/* =========================================================
   10. ORDER SUMMARY TEXT — EXACT FORMAT
========================================================= */
function buildOrderSummary(){
  const keys = Object.keys(cart);
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const deliveryMethod = getGetDeliveryLabel();
  const subtotal = getSubtotal();
  const delivery = keys.length ? DELIVERY_CHARGE[getDeliveryMethod()] : 0;
  const total = subtotal + delivery;

  let lines = [];
  
  // Header
  lines.push("Decant Bechi");
  lines.push("Order Summary");
  lines.push("─────────────────────");
  lines.push("");
  
  // Customer details
  if (name) lines.push(`Name: ${name}`);
  if (phone) lines.push(`Phone: ${phone}`);
  if (address) lines.push(`Address: ${address}`);
  if (name || phone || address) lines.push("");
  
  // Order items
  keys.forEach(key => {
    const entry = cart[key];
    const product = PRODUCTS.find(p => p.id === entry.productId);
    const size = product.sizes.find(s => s.ml === entry.ml);
    const unitPrice = getUnitPrice(product, size);
    const lineTotal = unitPrice * entry.qty;
    lines.push(`${product.name} (${product.brand}) — ${entry.ml}ml x${entry.qty} = ${lineTotal} tk`);
  });
  
  lines.push("");
  lines.push(`Subtotal: ${subtotal} tk`);
  lines.push(`Delivery (${deliveryMethod}): ${delivery} tk`);
  lines.push(`Total: ${total} tk`);
  lines.push("─────────────────────");
  
  return lines.join("\n");
}

function getGetDeliveryLabel(){
  return getDeliveryMethod() === "inside" ? "Inside Dhaka" : "Outside Dhaka";
}

/* =========================================================
   11. VALIDATION — Check if all fields are filled
========================================================= */
function validateOrder() {
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  
  // Check if cart is empty
  if (Object.keys(cart).length === 0) {
    alert("❌ Your bottle rack is empty — add a size first.");
    return false;
  }
  
  // Check if name is empty
  if (!name) {
    alert("❌ Please enter your name.");
    document.getElementById("custName").focus();
    document.getElementById("custName").style.borderColor = "#B85A36";
    return false;
  }
  
  // Check if phone is empty
  if (!phone) {
    alert("❌ Please enter your phone number.");
    document.getElementById("custPhone").focus();
    document.getElementById("custPhone").style.borderColor = "#B85A36";
    return false;
  }
  
  // Check if phone is exactly 11 digits
  if (phone.length !== 11) {
    alert("❌ Phone number must be exactly 11 digits.");
    document.getElementById("custPhone").focus();
    document.getElementById("custPhone").style.borderColor = "#B85A36";
    return false;
  }
  
  // Check if address is empty
  if (!address) {
    alert("❌ Please enter your delivery address.");
    document.getElementById("custAddress").focus();
    document.getElementById("custAddress").style.borderColor = "#B85A36";
    return false;
  }
  
  // Clear any error styling
  document.getElementById("custName").style.borderColor = "";
  document.getElementById("custPhone").style.borderColor = "";
  document.getElementById("custAddress").style.borderColor = "";
  
  return true;
}

/* =========================================================
   12. SEND / COPY ACTIONS (with validation)
========================================================= */
document.getElementById("sendOrderBtn").addEventListener("click", () => {
  if (!validateOrder()) return;
  
  const summary = buildOrderSummary();
  const url = `https://m.me/${FB_PAGE_USERNAME}?text=${encodeURIComponent(summary)}`;
  window.open(url, "_blank");
});

document.getElementById("copyOrderBtn").addEventListener("click", async () => {
  if (!validateOrder()) return;
  
  const summary = buildOrderSummary();
  try {
    await navigator.clipboard.writeText(summary);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = summary;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  const confirmEl = document.getElementById("copyConfirm");
  confirmEl.hidden = false;
  setTimeout(() => { confirmEl.hidden = true; }, 2000);
});

// Remove error styling when user starts typing in any field
document.getElementById("custName").addEventListener("focus", function() {
  this.style.borderColor = "";
});
document.getElementById("custAddress").addEventListener("focus", function() {
  this.style.borderColor = "";
});

/* =========================================================
   13. INIT
========================================================= */
loadProducts();