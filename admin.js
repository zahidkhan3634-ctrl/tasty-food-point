// ---------- AUTH ----------
firebase.auth().onAuthStateChanged(function(user){
    if(user){
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("adminPanel").style.display = "block";
        document.getElementById("logoutBtn").style.display = "inline-block";
        loadItems();
        loadReport('today');
        loadDeliverySettingsAdmin();
        loadRestaurantStatusAdmin();
    } else {
        document.getElementById("loginBox").style.display = "block";
        document.getElementById("adminPanel").style.display = "none";
        document.getElementById("logoutBtn").style.display = "none";
    }
});

function doLogin(){
    let email = document.getElementById("adminEmail").value;
    let password = document.getElementById("adminPassword").value;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .catch(function(err){
            document.getElementById("loginError").innerHTML = "Login failed: " + err.message;
        });
}

function doLogout(){
    firebase.auth().signOut();
}

// ---------- SEED EXISTING MENU (sirf pehli baar, agar list khali ho) ----------
const seedItems = [
    { name: "Chicken Nuggets (5Pc)", price: 200, image: "https://images.unsplash.com/photo-1562967914-608f82629710?w=600", inStock: true },
    { name: "Spicy Zinger Cheese Burger", price: 350, image: "https://images.unsplash.com/photo-1637710847214-f91d99669e18?w=600", inStock: true },
    { name: "Chicken Patty Burger", price: 250, image: "https://images.unsplash.com/photo-1513185158878-8d8c2a2a3da3?w=600", inStock: true },
    { name: "Double Chicken Patty Cheese Burger", price: 400, image: "https://images.unsplash.com/photo-1655895176036-bf1a11326e5c?w=600", inStock: true },
    { name: "Boneless Zinger Thai", price: 150, image: "https://images.unsplash.com/photo-1703575571935-058bc1a91d39?w=600", inStock: true },
    { name: "Chicken Drumstick", price: 100, image: "https://images.unsplash.com/photo-1605291581926-df4bf7ee3e89?w=600", inStock: true },
    { name: "Zinger Burger", price: 250, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600", inStock: true },
    { name: "Hot Wings (5Pc)", price: 200, image: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600", inStock: true },
    { name: "Large Fries", price: 100, image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=600", inStock: true }
];

function seedIfEmpty(){
    db.collection("menuItems").get().then(function(snapshot){
        if(snapshot.empty){
            seedItems.forEach(function(item){
                db.collection("menuItems").add(item);
            });
        }
    });
}

// ---------- LOAD & RENDER ITEMS ----------
function loadItems(){
    seedIfEmpty();

    db.collection("menuItems").orderBy("name").onSnapshot(function(snapshot){
        let html = "";

        snapshot.forEach(function(doc){
            let item = doc.data();
            let id = doc.id;
            let inStock = item.inStock !== false;

            html += `
                <div class="card p-3 mb-3 bg-dark text-white">
                    <div class="row align-items-center">
                        <div class="col-3 col-md-2">
                            <img src="${item.image}" style="width:100%; border-radius:8px;" onerror="this.onerror=null;this.src='https://placehold.co/400x300/3a0d0d/FFC94A?text=No+Image';">
                        </div>
                        <div class="col-9 col-md-4">
                            <strong>${item.name}</strong><br>
                            ${item.normalPrice ? `<span style="text-decoration:line-through; opacity:.6;">Rs.${item.normalPrice}</span> ` : ""}Rs.${item.price}<br>
                            ${item.description ? `<small class="text-white-50">${item.description}</small><br>` : ""}
                            <span class="badge bg-secondary mt-1">${item.category || 'Other'}</span>
                        </div>
                        <div class="col-6 col-md-3 mt-2 mt-md-0">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" ${inStock ? "checked" : ""}
                                    onchange="toggleStock('${id}', this.checked)">
                                <label class="form-check-label">${inStock ? "In Stock" : "Out of Stock"}</label>
                            </div>
                        </div>
                        <div class="col-6 col-md-3 mt-2 mt-md-0 text-end">
                            <button class="btn btn-sm btn-outline-warning me-1" onclick="editItem('${id}','${item.name.replace(/'/g,"\\'")}',${item.price},'${item.image}','${(item.category||'Other').replace(/'/g,"\\'")}')">Edit</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteItem('${id}')">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        });

        document.getElementById("itemsList").innerHTML = html || "<p class='text-white'>Koi item nahi hai.</p>";
    });
}

// ---------- ADD ----------
function addItem(){
    let name = document.getElementById("newName").value.trim();
    let description = document.getElementById("newDescription").value.trim();
    let price = parseFloat(document.getElementById("newPrice").value);
    let normalPriceRaw = document.getElementById("newNormalPrice").value.trim();
    let normalPrice = normalPriceRaw === "" ? null : parseFloat(normalPriceRaw);
    let category = document.getElementById("newCategory").value;
    let image = document.getElementById("newImage").value.trim();

    if(!name || !price || !image){
        alert("Please fill all fields.");
        return;
    }

    let itemData = {
        name: name,
        price: price,
        category: category,
        image: image,
        inStock: true
    };
    if(description) itemData.description = description;
    if(normalPrice !== null && !isNaN(normalPrice)) itemData.normalPrice = normalPrice;

    db.collection("menuItems").add(itemData).then(function(){
        document.getElementById("newName").value = "";
        document.getElementById("newDescription").value = "";
        document.getElementById("newPrice").value = "";
        document.getElementById("newNormalPrice").value = "";
        document.getElementById("newImage").value = "";
    });
}

// ---------- STOCK TOGGLE ----------
function toggleStock(id, isChecked){
    db.collection("menuItems").doc(id).update({ inStock: isChecked });
}

// ---------- EDIT ----------
function editItem(id, currentName, currentPrice, currentImage, currentCategory){
    let newName = prompt("Item Name:", currentName);
    if(newName === null) return;

    let newPrice = prompt("Price:", currentPrice);
    if(newPrice === null) return;

    let newCategory = prompt("Category (Deals / Burgers / Wings / Chicken Snacks / Fries / Cold Drinks / Snacks / Other):", currentCategory || "Other");
    if(newCategory === null) return;

    let newImage = prompt("Image URL:", currentImage);
    if(newImage === null) return;

    db.collection("menuItems").doc(id).update({
        name: newName.trim(),
        price: parseFloat(newPrice),
        category: newCategory.trim(),
        image: newImage.trim()
    });
}

// ---------- DELETE ----------
function deleteItem(id){
    if(confirm("Kya aap is item ko permanently delete karna chahte hain?")){
        db.collection("menuItems").doc(id).delete();
    }
}

// ---------- RESTAURANT OPEN/CLOSE STATUS ----------
function loadRestaurantStatusAdmin(){
    db.collection("settings").doc("restaurant").get().then(function(doc){
        let isOpen = true; // default open
        if(doc.exists && typeof doc.data().isOpen === "boolean"){
            isOpen = doc.data().isOpen;
        }
        document.getElementById("restaurantToggle").checked = isOpen;
        updateRestaurantStatusLabel(isOpen);
    });
}

function updateRestaurantStatusLabel(isOpen){
    let label = document.getElementById("restaurantStatusLabel");
    if(isOpen){
        label.innerHTML = "🟢 Restaurant OPEN — customers order kar sakte hain";
    } else {
        label.innerHTML = "🔴 Restaurant CLOSED — website par order band hai";
    }
}

function toggleRestaurantStatus(){
    let isOpen = document.getElementById("restaurantToggle").checked;
    updateRestaurantStatusLabel(isOpen);

    db.collection("settings").doc("restaurant").set({
        isOpen: isOpen
    }).catch(function(err){
        alert("❌ Status save nahi hua: " + err.message);
    });
}

// ---------- DELIVERY SETTINGS ----------
function loadDeliverySettingsAdmin(){
    db.collection("settings").doc("delivery").get().then(function(doc){
        let charge = 100;
        let freeAbove = 1000;
        if(doc.exists){
            let data = doc.data();
            if(typeof data.charge === "number") charge = data.charge;
            if(typeof data.freeAbove === "number") freeAbove = data.freeAbove;
        }
        document.getElementById("deliveryChargeInput").value = charge;
        document.getElementById("freeDeliveryInput").value = freeAbove;
    });
}

function saveDeliverySettings(){
    let charge = parseFloat(document.getElementById("deliveryChargeInput").value);
    let freeAbove = parseFloat(document.getElementById("freeDeliveryInput").value);
    let msgBox = document.getElementById("deliverySettingsMsg");

    if(isNaN(charge) || isNaN(freeAbove) || charge < 0 || freeAbove < 0){
        msgBox.innerHTML = "⚠️ Sahi numbers likhein.";
        return;
    }

    db.collection("settings").doc("delivery").set({
        charge: charge,
        freeAbove: freeAbove
    }).then(function(){
        msgBox.innerHTML = "✅ Saved! Website par turant apply ho jayega.";
        setTimeout(function(){ msgBox.innerHTML = ""; }, 3000);
    }).catch(function(err){
        msgBox.innerHTML = "❌ Error: " + err.message;
    });
}

// ---------- SALES REPORT ----------
function loadReport(range){
    // highlight active button
    ["today","week","month"].forEach(function(r){
        let btn = document.getElementById("btn" + r.charAt(0).toUpperCase() + r.slice(1));
        if(btn) btn.classList.remove("btn-warning");
        if(btn) btn.classList.add("btn-outline-warning");
    });
    let activeBtn = document.getElementById("btn" + range.charAt(0).toUpperCase() + range.slice(1));
    if(activeBtn){
        activeBtn.classList.remove("btn-outline-warning");
        activeBtn.classList.add("btn-warning");
    }

    let now = new Date();
    let startDate;

    if(range === "today"){
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if(range === "week"){
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    document.getElementById("reportSummary").innerHTML = "<p class='text-white-50'>Loading report...</p>";
    document.getElementById("reportItems").innerHTML = "<p class='text-white-50'>Loading...</p>";

    db.collection("orders")
      .where("createdAt", ">=", startDate)
      .get()
      .then(function(snapshot){

        let totalSales = 0;
        let orderCount = 0;
        let itemStats = {};

        snapshot.forEach(function(doc){
            let order = doc.data();
            orderCount++;
            totalSales += order.grandTotal || 0;

            (order.items || []).forEach(function(it){
                if(!itemStats[it.name]){
                    itemStats[it.name] = { qty: 0, revenue: 0 };
                }
                itemStats[it.name].qty += it.qty;
                itemStats[it.name].revenue += it.subtotal;
            });
        });

        document.getElementById("reportSummary").innerHTML = `
            <div class="row text-center">
                <div class="col-6">
                    <h3 class="text-warning mb-0">Rs.${totalSales}</h3>
                    <small class="text-white-50">Total Sales</small>
                </div>
                <div class="col-6">
                    <h3 class="text-warning mb-0">${orderCount}</h3>
                    <small class="text-white-50">Orders</small>
                </div>
            </div>
        `;

        let sortedItems = Object.keys(itemStats).map(function(name){
            return { name: name, qty: itemStats[name].qty, revenue: itemStats[name].revenue };
        }).sort(function(a, b){ return b.qty - a.qty; });

        if(sortedItems.length === 0){
            document.getElementById("reportItems").innerHTML = "<p class='text-white-50'>Is period mein koi order nahi hua.</p>";
            return;
        }

        let itemsHtml = "<table class='table table-dark table-sm mb-0'><thead><tr><th>Item</th><th class='text-end'>Qty Sold</th><th class='text-end'>Revenue</th></tr></thead><tbody>";
        sortedItems.forEach(function(item){
            itemsHtml += `<tr><td>${item.name}</td><td class='text-end'>${item.qty}</td><td class='text-end'>Rs.${item.revenue}</td></tr>`;
        });
        itemsHtml += "</tbody></table>";

        document.getElementById("reportItems").innerHTML = itemsHtml;

    }).catch(function(err){
        document.getElementById("reportSummary").innerHTML = "<p class='text-danger'>Report load nahi ho saka: " + err.message + "</p>";
        document.getElementById("reportItems").innerHTML = "";
    });
}
