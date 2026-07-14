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

// Google Sheets Direct Method — for loading products
const SHEET_ID = "1F-T5nMmYkalKJONVzt2bqIp1-vXa4HpVV5-jLCYs7M0";
const SHEET_NAME = "Sheet1";

// Google Apps Script Web App URL — for saving orders
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxIwvj4JBouhOhr5Y2vBEOsNJB_RQKBmtYmmiecHhjL1-yljJkwJf2IloQsfvxr5aGt/exec";

/* =========================================================
   2. PRODUCT DATA — loaded directly from Google Sheets
========================================================= */
let PRODUCTS = [];

async function loadProducts() {
  try {
    document.getElementById('productGrid').innerHTML = 
      '<p style="text-align:center;padding:40px;">Loading perfumes...</p>';
    
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
    const response = await fetch(url);
    const text = await response.text();
    
    const jsonString = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
    const json = JSON.parse(jsonString);
    const rows = json.table.rows;
    
    if (!rows || rows.length === 0) {
      throw new Error('No data found in the sheet');
    }
    
    PRODUCTS = rows.map((row, index) => {
      const cells = row.c;
      
      const id = cells[0]?.v || `p${index + 1}`;
      const name = cells[1]?.v || '';
      const brand = cells[2]?.v || '';
      const notes = cells[3]?.v || '';
      const status = cells[4]?.v || 'available';
      const sizesString = cells[5]?.v || '';
      
      let sizes = [];
      if (sizesString) {
        sizes = sizesString.split(',').filter(s => s.trim() !== '').map(part => {
          const [ml, price] = part.split(':');
          if (price && price.includes('/')) {
            const [regular, sale] = price.split('/');
            return { 
              ml: parseInt(ml), 
              price: parseInt(regular), 
              salePrice: parseInt(sale) 
            };
          }
          return { 
            ml: parseInt(ml), 
            price: parseInt(price) 
          };
        });
      }
      
      return {
        id: id,
        name: name || 'Unnamed Product',
        brand: brand || 'Unknown Brand',
        gender: 'unisex',
        notes: notes || '',
        status: status,
        sizes: sizes
      };
    });
    
    renderGrid();
    renderCart();
    
  } catch (error) {
    console.error('Error loading products:', error);
    document.getElementById('productGrid').innerHTML = 
      '<p style="text-align:center;padding:40px;">Unable to load products. Please refresh or try again later.<br><small>Error: ' + error.message + '</small></p>';
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

const toast         = document.getElementById("toast");
const toastMessage  = document.getElementById("toastMessage");

const custName    = document.getElementById("custName");
const custPhone   = document.getElementById("custPhone");
const custEmail   = document.getElementById("custEmail");
const custAddress = document.getElementById("custAddress");

document.getElementById("insidePriceLabel").textContent = `৳${DELIVERY_CHARGE.inside}`;
document.getElementById("outsidePriceLabel").textContent = `৳${DELIVERY_CHARGE.outside}`;

/* =========================================================
   4.5 PHONE VALIDATION
========================================================= */
custPhone.addEventListener("input", function(e) {
  this.value = this.value.replace(/\D/g, '');
  if (this.value.length > 11) {
    this.value = this.value.slice(0, 11);
  }
});

custPhone.addEventListener("blur", function() {
  if (this.value.length > 0 && this.value.length !== 11) {
    this.style.borderColor = "#B85A36";
    this.style.boxShadow = "0 0 0 3px rgba(184, 90, 54, 0.2)";
  } else {
    this.style.borderColor = "";
    this.style.boxShadow = "";
  }
});

custPhone.addEventListener("focus", function() {
  this.style.borderColor = "";
  this.style.boxShadow = "";
});

custEmail.addEventListener("blur", function() {
  const email = this.value.trim();
  if (email && !email.includes('@')) {
    this.style.borderColor = "#B85A36";
    this.style.boxShadow = "0 0 0 3px rgba(184, 90, 54, 0.2)";
  } else {
    this.style.borderColor = "";
    this.style.boxShadow = "";
  }
});

custEmail.addEventListener("focus", function() {
  this.style.borderColor = "";
  this.style.boxShadow = "";
});

/* =========================================================
   4.6 TOAST NOTIFICATION
========================================================= */
function showToast(productName, ml) {
  toastMessage.innerHTML = `<span class="toast-product-name">${productName}</span> — ${ml}ml added to cart`;
  toast.classList.add("show");
  
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  
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
  const maxMl = p.sizes.length > 0 ? Math.max(...p.sizes.map(s => s.ml)) : 10;

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

  const badge = isOut
    ? `<span class="status-badge out">Out of Stock</span>`
    : `<span class="status-badge available">Available</span>`;

  const noSizesHTML = p.sizes.length === 0 ? '<p style="color:var(--text-light);font-size:0.8rem;">No sizes available</p>' : '';

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
      <div class="size-row">${sizesHTML || noSizesHTML}</div>
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
  showToast(product.name, ml);
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

document.getElementById("searchInput").addEventListener("input", (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderGrid();
});

/* =========================================================
   10. ORDER SUMMARY TEXT
========================================================= */
function buildOrderSummary(){
  const keys = Object.keys(cart);
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const email = document.getElementById("custEmail").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const deliveryMethod = getGetDeliveryLabel();
  const subtotal = getSubtotal();
  const delivery = keys.length ? DELIVERY_CHARGE[getDeliveryMethod()] : 0;
  const total = subtotal + delivery;

  let lines = [];
  
  lines.push("Decant Bechi");
  lines.push("Order Summary");
  lines.push("---------------------");
  lines.push("");
  
  if (name) lines.push("Name: " + name);
  if (phone) lines.push("Phone: " + phone);
  if (email) lines.push("Email: " + email);
  if (address) lines.push("Address: " + address);
  if (name || phone || email || address) lines.push("");
  
  keys.forEach(key => {
    const entry = cart[key];
    const product = PRODUCTS.find(p => p.id === entry.productId);
    const size = product.sizes.find(s => s.ml === entry.ml);
    const unitPrice = getUnitPrice(product, size);
    const lineTotal = unitPrice * entry.qty;
    lines.push(product.name + " (" + product.brand + ") — " + entry.ml + "ml x" + entry.qty + " = " + lineTotal + " tk");
  });
  
  lines.push("");
  lines.push("Subtotal: " + subtotal + " tk");
  lines.push("Delivery (" + deliveryMethod + "): " + delivery + " tk");
  lines.push("Total: " + total + " tk");
  lines.push("---------------------");
  
  return lines.join("\n");
}

function getGetDeliveryLabel(){
  return getDeliveryMethod() === "inside" ? "Inside Dhaka" : "Outside Dhaka";
}

/* =========================================================
   11. VALIDATION
========================================================= */
function validateOrder() {
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const email = document.getElementById("custEmail").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  
  if (Object.keys(cart).length === 0) {
    alert("Your bottle rack is empty. Please add a size first.");
    return false;
  }
  
  if (!name) {
    alert("Please enter your name.");
    document.getElementById("custName").focus();
    document.getElementById("custName").style.borderColor = "#B85A36";
    return false;
  }
  
  if (!phone) {
    alert("Please enter your phone number.");
    document.getElementById("custPhone").focus();
    document.getElementById("custPhone").style.borderColor = "#B85A36";
    return false;
  }
  
  if (phone.length !== 11) {
    alert("Phone number must be exactly 11 digits.");
    document.getElementById("custPhone").focus();
    document.getElementById("custPhone").style.borderColor = "#B85A36";
    return false;
  }
  
  if (!email) {
    alert("Please enter your email address.");
    document.getElementById("custEmail").focus();
    document.getElementById("custEmail").style.borderColor = "#B85A36";
    return false;
  }
  
  if (!email.includes('@') || !email.includes('.')) {
    alert("Please enter a valid email address (e.g., name@example.com).");
    document.getElementById("custEmail").focus();
    document.getElementById("custEmail").style.borderColor = "#B85A36";
    return false;
  }
  
  if (!address) {
    alert("Please enter your delivery address.");
    document.getElementById("custAddress").focus();
    document.getElementById("custAddress").style.borderColor = "#B85A36";
    return false;
  }
  
  document.getElementById("custName").style.borderColor = "";
  document.getElementById("custPhone").style.borderColor = "";
  document.getElementById("custEmail").style.borderColor = "";
  document.getElementById("custAddress").style.borderColor = "";
  
  return true;
}

/* =========================================================
   12. SEND / COPY ACTIONS 
========================================================= */

async function sendOrderToSheet(orderData) {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });
    
    return true;
  } catch (error) {
    console.error('Webhook error:', error);
    return false;
  }
}

function buildOrderData() {
  const keys = Object.keys(cart);
  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const email = document.getElementById("custEmail").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const deliveryMethod = getGetDeliveryLabel();
  const subtotal = getSubtotal();
  const delivery = keys.length ? DELIVERY_CHARGE[getDeliveryMethod()] : 0;
  const total = subtotal + delivery;
  
  const items = keys.map(key => {
    const entry = cart[key];
    const product = PRODUCTS.find(p => p.id === entry.productId);
    const size = product.sizes.find(s => s.ml === entry.ml);
    const unitPrice = getUnitPrice(product, size);
    return product.name + " (" + product.brand + ") — " + entry.ml + "ml x" + entry.qty + " = " + (unitPrice * entry.qty) + " tk";
  }).join('\n');
  
  return {
    timestamp: new Date().toLocaleString(),
    name: name,
    phone: phone,
    email: email,
    address: address,
    deliveryMethod: deliveryMethod,
    items: items,
    subtotal: subtotal,
    deliveryCharge: delivery,
    total: total
  };
}

document.getElementById("sendOrderBtn").addEventListener("click", async () => {
  if (!validateOrder()) return;
  
  const orderData = buildOrderData();
  
  const btn = document.getElementById("sendOrderBtn");
  const originalText = btn.textContent;
  btn.textContent = "Placing Order...";
  btn.disabled = true;
  
  try {
    const sheetSuccess = await sendOrderToSheet(orderData);
    
    if (sheetSuccess) {
      showToastMessage("Order placed successfully. Check your email for invoice.");
      
      cart = {};
      saveCart();
      renderCart();
      closeDrawer();
      
    } else {
      showToastMessage("Order could not be placed. Please try again.");
    }
    
  } catch (error) {
    console.error('Error placing order:', error);
    alert("There was an error placing your order. Please try again or contact us directly.");
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

function showToastMessage(message) {
  toastMessage.innerHTML = message;
  toast.classList.add("show");
  
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

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
  
  const orderData = buildOrderData();
  await sendOrderToSheet(orderData);
});

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