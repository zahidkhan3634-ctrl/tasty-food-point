let cart = [];
let menuItemsCache = [];

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

function renderMenu(){
    let container = document.getElementById("menuContainer");

    if(menuItemsCache.length === 0){
        container.innerHTML = `<p class="text-center text-white">Abhi koi item nahi hai.</p>`;
        return;
    }

    let html = "";

    menuItemsCache.forEach(function(item){
        let actionId = "action_" + item.id;
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

        html += `
            <div class="col-md-4 mb-4">
                <div class="card${!inStock ? ' out-of-stock-card' : ''}">
                    <img src="${item.image}" class="card-img-top">
                    <div class="card-body text-center">
                        <h4>${item.name}</h4>
                        <p>Rs.${item.price}</p>
                        <div class="item-action" id="${actionId}">
                            ${actionHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
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
    let box = document.getElementById(actionId);
    if(!box) return;

    let menuItem = menuItemsCache.find(function(m){ return m.id === id; });
    if(!menuItem) return;

    let cartItem = cart.find(function(c){ return c.id === id; });

    if(cartItem){
        box.innerHTML = stepperHTML(id, menuItem.name, menuItem.price, actionId, cartItem.qty);
    } else {
        box.innerHTML = addToCartButtonHTML(id, menuItem.name, menuItem.price, actionId);
    }
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

    let deliveryCharge = (total >= 800) ? 0 : 50;
    let grandTotal = total === 0 ? 0 : total + deliveryCharge;
    document.getElementById("grandTotal").innerHTML = grandTotal;

    let noticeBox = document.getElementById("deliveryNotice");
    if(noticeBox){
        if(total >= 800){
            noticeBox.innerHTML = "🎉 Free Delivery Unlocked!";
        } else {
            let remaining = 800 - total;
            noticeBox.innerHTML = "🚚 Delivery: Rs.50 &nbsp;|&nbsp; Add Rs." + remaining + " more to get FREE delivery (orders above Rs.800)";
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
    let deliveryCharge = (total >= 800) ? 0 : 50;
    let grandTotal = total + deliveryCharge;
    let deliveryText = deliveryCharge === 0 ? "FREE 🎉" : "Rs.50";

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

    let url = "https://wa.me/923483111205?text=" + encodeURIComponent(message);
    window.location.href = url;
}

// page load hote hi menu fetch karo
loadMenu();
