let cart = [];
let menuItemsCache = [];

// ---------- DELIVERY SETTINGS (loaded from Firestore, admin can change from admin panel) ----------
let deliverySettings = { charge: 100, freeAbove: 1000 }; // defaults until Firestore loads

// ---------- RESTAURANT OPEN/CLOSE STATUS ----------
function checkRestaurantStatus(){
    db.collection("settings").doc("restaurant").get().then(function(doc){
        let isOpen = true; // default open if not set
        if(doc.exists && typeof doc.data().isOpen === "boolean"){
            isOpen = doc.data().isOpen;
        }
        let overlay = document.getElementById("closedOverlay");
        if(overlay){
            overlay.style.display = isOpen ? "none" : "flex";
        }
    }).catch(function(err){
        console.log("Restaurant status check failed:", err);
    });
}

function loadDeliverySettings(){
    db.collection("settings").doc("delivery").get().then(function(doc){
        if(doc.exists){
            let data = doc.data();
            if(typeof data.charge === "number") deliverySettings.charge = data.charge;
            if(typeof data.freeAbove === "number") deliverySettings.freeAbove = data.freeAbove;
        }
        let ribbon = document.getElementById("deliveryRibbon");
        if(ribbon){
            ribbon.innerHTML = "🎉 Order above Rs." + deliverySettings.freeAbove + " &amp; get FREE Delivery";
        }
        renderCart(); // re-render with correct values once settings are loaded
    }).catch(function(err){
        console.log("Delivery settings load failed, using defaults:", err);
    });
}

// ---------- PAYMENT ACCOUNT DETAILS ----------
const paymentAccounts = {
    "JazzCash": { name: "Zahid Khan", number: "03116563925" },
    "Easypaisa": { name: "Zahid Khan", number: "03483111205" }
};

function showPaymentDetails(){
    let method = document.getElementById("paymentMethod").value;
    let box = document.getElementById("paymentDetailsBox");

    if(paymentAccounts[method]){
        let acc = paymentAccounts[method];
        box.innerHTML = `
            💳 <strong>${method} Account</strong><br>
            Name: ${acc.name}<br>
            Number: ${acc.number}<br>
            <small>Order place karne ke baad payment send karein aur screenshot WhatsApp par bhej dein.</small>
        `;
        box.style.display = "block";
    } else {
        box.style.display = "none";
        box.innerHTML = "";
    }
}

// ---------- PWA: SERVICE WORKER + INSTALL PROMPT ----------
if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(function(err){
        console.log("Service worker registration failed:", err);
    });
}

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", function(event){
    event.preventDefault();
    deferredInstallPrompt = event;
    let btn = document.getElementById("installBtn");
    if(btn) btn.style.display = "inline-block";
});

document.addEventListener("DOMContentLoaded", function(){
    let installBtn = document.getElementById("installBtn");
    if(installBtn){
        installBtn.addEventListener("click", function(){
            if(!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            deferredInstallPrompt.userChoice.then(function(){
                deferredInstallPrompt = null;
                installBtn.style.display = "none";
            });
        });
    }
});

window.addEventListener("appinstalled", function(){
    let btn = document.getElementById("installBtn");
    if(btn) btn.style.display = "none";
});

// ---------- LOAD MENU FROM FIREBASE ----------
function loadMenu(){
    db.collection("menuItems").orderBy("name").get().then(function(snapshot){

        menuItemsCache = [];
        snapshot.forEach(function(doc){
            menuItemsCache.push({ id: doc.id, ...doc.data() });
        });

        renderMenu();
    }).catch(function(err){
        document.getElementById("menuContainer").innerHTML =
            `<p class="text-center text-warning">Menu load nahi ho saka. Firebase config check karein.</p>`;
        console.error(err);
    });
}

// Fixed category order (items without a category go under "Other")
const CATEGORY_ORDER = ["Deals", "Burgers", "Wings", "Chicken Snacks", "Fries", "Cold Drinks", "Snacks", "Other"];

function getCategory(item){
    return item.category && item.category.trim() !== "" ? item.category : "Other";
}

function renderMenu(){
    let container = document.getElementById("menuContainer");
    let tabsContainer = document.getElementById("categoryTabs");

    // Only show in-stock items on the customer site
    let visibleItems = menuItemsCache.filter(function(item){ return item.inStock !== false; });

    if(visibleItems.length === 0){
        container.innerHTML = `<p class="text-center text-white">Abhi koi item available nahi hai.</p>`;
        tabsContainer.innerHTML = "";
        return;
    }

    // Group items by category
    let groups = {};
    visibleItems.forEach(function(item){
        let cat = getCategory(item);
        if(!groups[cat]) groups[cat] = [];
        groups[cat].push(item);
    });

    // Sort categories: fixed order first, then any extra custom categories alphabetically
    let categoriesPresent = Object.keys(groups);
    categoriesPresent.sort(function(a, b){
        let ia = CATEGORY_ORDER.indexOf(a);
        let ib = CATEGORY_ORDER.indexOf(b);
        if(ia === -1) ia = 999;
        if(ib === -1) ib = 999;
        if(ia !== ib) return ia - ib;
        return a.localeCompare(b);
    });

    // Render category tabs
    let tabsHtml = `<button class="cat-tab" onclick="scrollToCategory('all')">All</button>`;
    categoriesPresent.forEach(function(cat){
        let safeId = "cat_" + cat.replace(/[^a-zA-Z0-9]/g, "_");
        tabsHtml += `<button class="cat-tab" onclick="scrollToCategory('${safeId}')">${cat}</button>`;
    });
    tabsContainer.innerHTML = tabsHtml;

    // Render sections
    let html = "";
    categoriesPresent.forEach(function(cat){
        let safeId = "cat_" + cat.replace(/[^a-zA-Z0-9]/g, "_");
        html += `<div id="${safeId}" class="category-section">`;
        html += `<h4 class="category-heading">${cat}</h4>`;
        html += `<div class="row">`;
        groups[cat].forEach(function(item){
            html += renderItemCard(item);
        });
        html += `</div></div>`;
    });

    container.innerHTML = html;
}

function scrollToCategory(id){
    if(id === "all"){
        document.getElementById("menu").scrollIntoView({ behavior: "smooth" });
        return;
    }
    let el = document.getElementById(id);
    if(el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderItemCard(item, idPrefix){
    idPrefix = idPrefix || "action_";
    let actionId = idPrefix + item.id;
    let inStock = item.inStock !== false;

    let actionHTML = "";
    if(!inStock){
        actionHTML = `<button class="btn btn-secondary w-100" disabled>Out of Stock</button>`;
    } else {
        let cartItem = cart.find(function(c){ return c.id === item.id; });
        if(cartItem){
            actionHTML = stepperHTML(item.id, item.name, item.price, actionId, cartItem.qty);
        } else {
            actionHTML = addToCartButtonHTML(item.id, item.name, item.price, actionId);
        }
    }

    let priceHTML = "";
    if(item.normalPrice && item.normalPrice > item.price){
        priceHTML = `<p><span style="text-decoration:line-through; color:rgba(245,239,230,.5); font-size:0.85em;">Rs.${item.normalPrice}</span> &nbsp; <span style="color:var(--gold); font-weight:700;">Rs.${item.price}</span></p>`;
    } else {
        priceHTML = `<p>Rs.${item.price}</p>`;
    }

    let descHTML = item.description ? `<p style="font-size:0.82em; color:rgba(245,239,230,.7); margin-bottom:8px;">${item.description}</p>` : "";

    return `
        <div class="col-md-4 mb-4">
            <div class="card${!inStock ? ' out-of-stock-card' : ''}">
                <img src="${item.image}" class="card-img-top" onerror="this.onerror=null;this.src='https://placehold.co/400x300/3a0d0d/FFC94A?text=Tasty+Food+Point';">
                <div class="card-body text-center">
                    <h4>${item.name}</h4>
                    ${descHTML}
                    ${priceHTML}
                    <div class="item-action" id="${actionId}">
                        ${actionHTML}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ---------- SEARCH ----------
function handleMenuSearch(){
    let query = document.getElementById("menuSearchInput").value.trim().toLowerCase();
    let resultsSection = document.getElementById("searchResultsSection");
    let resultsContainer = document.getElementById("searchResultsContainer");

    if(query === ""){
        resultsSection.style.display = "none";
        resultsContainer.innerHTML = "";
        return;
    }

    let matches = menuItemsCache.filter(function(item){
        return item.inStock !== false && item.name.toLowerCase().includes(query);
    });

    resultsSection.style.display = "block";

    if(matches.length === 0){
        resultsContainer.innerHTML = `<p class="text-white-50">Koi item nahi mila "${query}" ke liye.</p>`;
        return;
    }

    let html = "";
    matches.forEach(function(item){
        html += renderItemCard(item, "search_action_");
    });
    resultsContainer.innerHTML = html;
}

// ---------- CART LOGIC (id based, so same-name items don't clash) ----------
function stepperHTML(id, name, price, actionId, qty){
    return `
        <button class="stepper-btn" onclick="decreaseCardQty('${id}', '${actionId}')">−</button>
        <span class="stepper-qty">${qty}</span>
        <button class="stepper-btn" onclick="increaseCardQty('${id}', '${actionId}')">+</button>
    `;
}

function addToCartButtonHTML(id, name, price, actionId){
    return `<button class="btn btn-warning w-100" onclick="addToCart('${id}','${name.replace(/'/g, "\\'")}', ${price}, '${actionId}')">Add To Cart</button>`;
}

function syncCardAction(id, actionId){
    let menuItem = menuItemsCache.find(function(m){ return m.id === id; });
    if(!menuItem) return;

    let cartItem = cart.find(function(c){ return c.id === id; });

    // Update both possible instances of this item's action box (category section + search results)
    ["action_" + id, "search_action_" + id].forEach(function(possibleId){
        let box = document.getElementById(possibleId);
        if(!box) return;

        if(cartItem){
            box.innerHTML = stepperHTML(id, menuItem.name, menuItem.price, possibleId, cartItem.qty);
        } else {
            box.innerHTML = addToCartButtonHTML(id, menuItem.name, menuItem.price, possibleId);
        }
    });
}

function addToCart(id, name, price, actionId){
    let existingItem = cart.find(function(item){ return item.id === id; });

    if(existingItem){
        existingItem.qty += 1;
    } else {
        cart.push({ id: id, name: name, price: price, qty: 1, actionId: actionId });
    }

    syncCardAction(id, actionId);
    renderCart();
}

function increaseCardQty(id, actionId){
    let item = cart.find(function(item){ return item.id === id; });
    if(item){
        item.qty += 1;
    }
    syncCardAction(id, actionId);
    renderCart();
}

function decreaseCardQty(id, actionId){
    let item = cart.find(function(item){ return item.id === id; });
    if(item){
        item.qty -= 1;
        if(item.qty <= 0){
            cart = cart.filter(function(i){ return i.id !== id; });
        }
    }
    syncCardAction(id, actionId);
    renderCart();
}

function increaseQty(id){
    let item = cart.find(function(item){ return item.id === id; });
    if(item){
        item.qty += 1;
        syncCardAction(id, item.actionId);
        renderCart();
    }
}

function decreaseQty(id){
    let item = cart.find(function(item){ return item.id === id; });
    if(item){
        item.qty -= 1;
        let actionId = item.actionId;
        if(item.qty <= 0){
            cart = cart.filter(function(i){ return i.id !== id; });
        }
        syncCardAction(id, actionId);
        renderCart();
    }
}

function removeFromCart(id){
    let item = cart.find(function(i){ return i.id === id; });
    if(item){
        cart = cart.filter(function(i){ return i.id !== id; });
        syncCardAction(id, item.actionId);
    }
    renderCart();
}

function calculateTotal(){
    let total = 0;
    cart.forEach(function(item){
        total += item.price * item.qty;
    });
    return total;
}

function renderCart(){
    let html = "";

    cart.forEach(function(item){
        let subtotal = item.price * item.qty;
        html += `
            <div class="cart-row">
                <p>🍔 ${item.name} - Rs.${item.price} x ${item.qty} = Rs.${subtotal}</p>
                <div class="qty-controls">
                    <button onclick="decreaseQty('${item.id}')">−</button>
                    <span>${item.qty}</span>
                    <button onclick="increaseQty('${item.id}')">+</button>
                    <button onclick="removeFromCart('${item.id}')">🗑️</button>
                </div>
            </div>
        `;
    });

    document.getElementById("cartItems").innerHTML = html || "No items added yet.";

    let total = calculateTotal();
    document.getElementById("totalPrice").innerHTML = total;

    let deliveryCharge = (total >= deliverySettings.freeAbove) ? 0 : deliverySettings.charge;
    let grandTotal = total === 0 ? 0 : total + deliveryCharge;
    document.getElementById("grandTotal").innerHTML = grandTotal;

    let noticeBox = document.getElementById("deliveryNotice");
    if(noticeBox){
        if(total >= deliverySettings.freeAbove){
            noticeBox.innerHTML = "🎉 Free Delivery Unlocked!";
        } else {
            let remaining = deliverySettings.freeAbove - total;
            noticeBox.innerHTML = "🚚 Delivery: Rs." + deliverySettings.charge + " &nbsp;|&nbsp; Add Rs." + remaining + " more to get FREE delivery (orders above Rs." + deliverySettings.freeAbove + ")";
        }
    }
}

function placeOrder(){
    if(cart.length === 0){
        alert("Please add at least one item.");
        return;
    }

    let name = document.getElementById("customerName").value;
    let phone = document.getElementById("customerPhone").value;
    let address = document.getElementById("customerAddress").value;
    let payment = document.getElementById("paymentMethod").value;

    let order = "";
    cart.forEach(function(item){
        let subtotal = item.price * item.qty;
        order += "• " + item.name + " x " + item.qty + " - Rs." + subtotal + "\n";
    });

    let total = calculateTotal();
    let deliveryCharge = (total >= deliverySettings.freeAbove) ? 0 : deliverySettings.charge;
    let grandTotal = total + deliveryCharge;
    let deliveryText = deliveryCharge === 0 ? "FREE 🎉" : "Rs." + deliverySettings.charge;

    let paymentLine = "💳 Payment: " + payment;
    if(paymentAccounts[payment]){
        let acc = paymentAccounts[payment];
        paymentLine += `\n➡️ Send Rs.${grandTotal} to ${acc.name} (${acc.number}) via ${payment}\n📸 Payment karne ke baad screenshot yahin WhatsApp par bhej dein.`;
    }

    let message =
`🍔 Tasty Food Point

👤 Name: ${name}
📞 Phone: ${phone}
📍 Address: ${address}

🛒 Order:
${order}

💰 Food Total: Rs.${total}
🚚 Delivery: ${deliveryText}
💵 Grand Total: Rs.${grandTotal}

${paymentLine}`;

    // ---------- SAVE ORDER FOR SALES TRACKING ----------
    let orderItems = cart.map(function(item){
        return { name: item.name, price: item.price, qty: item.qty, subtotal: item.price * item.qty };
    });

    db.collection("orders").add({
        items: orderItems,
        foodTotal: total,
        deliveryCharge: deliveryCharge,
        grandTotal: grandTotal,
        payment: payment,
        customerName: name,
        customerPhone: phone,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(err){
        console.log("Order save failed (sales tracking):", err);
    });

    let url = "https://wa.me/923483111205?text=" + encodeURIComponent(message);
    window.location.href = url;
}

// page load hote hi menu aur delivery settings fetch karo
loadMenu();
loadDeliverySettings();
checkRestaurantStatus();
