// ---------- AUTH ----------
firebase.auth().onAuthStateChanged(function(user){
    if(user){
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("adminPanel").style.display = "block";
        document.getElementById("logoutBtn").style.display = "inline-block";
        loadItems();
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
                            <img src="${item.image}" style="width:100%; border-radius:8px;">
                        </div>
                        <div class="col-9 col-md-4">
                            <strong>${item.name}</strong><br>
                            Rs.${item.price}
                        </div>
                        <div class="col-6 col-md-3 mt-2 mt-md-0">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" ${inStock ? "checked" : ""}
                                    onchange="toggleStock('${id}', this.checked)">
                                <label class="form-check-label">${inStock ? "In Stock" : "Out of Stock"}</label>
                            </div>
                        </div>
                        <div class="col-6 col-md-3 mt-2 mt-md-0 text-end">
                            <button class="btn btn-sm btn-outline-warning me-1" onclick="editItem('${id}','${item.name.replace(/'/g,"\\'")}',${item.price},'${item.image}')">Edit</button>
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
    let price = parseFloat(document.getElementById("newPrice").value);
    let image = document.getElementById("newImage").value.trim();

    if(!name || !price || !image){
        alert("Please fill all fields.");
        return;
    }

    db.collection("menuItems").add({
        name: name,
        price: price,
        image: image,
        inStock: true
    }).then(function(){
        document.getElementById("newName").value = "";
        document.getElementById("newPrice").value = "";
        document.getElementById("newImage").value = "";
    });
}

// ---------- STOCK TOGGLE ----------
function toggleStock(id, isChecked){
    db.collection("menuItems").doc(id).update({ inStock: isChecked });
}

// ---------- EDIT ----------
function editItem(id, currentName, currentPrice, currentImage){
    let newName = prompt("Item Name:", currentName);
    if(newName === null) return;

    let newPrice = prompt("Price:", currentPrice);
    if(newPrice === null) return;

    let newImage = prompt("Image URL:", currentImage);
    if(newImage === null) return;

    db.collection("menuItems").doc(id).update({
        name: newName.trim(),
        price: parseFloat(newPrice),
        image: newImage.trim()
    });
}

// ---------- DELETE ----------
function deleteItem(id){
    if(confirm("Kya aap is item ko permanently delete karna chahte hain?")){
        db.collection("menuItems").doc(id).delete();
    }
}
