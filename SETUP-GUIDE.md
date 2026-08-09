# Tasty Food Point — Admin Panel Setup Guide

Ye setup **ek hi baar** karni hai. Uske baad aap kabhi bhi `admin.html` khol kar items manage kar sakte hain, aur changes turant har customer ki site pe dikhengi.

---

## Step 1: Firebase Project Banayein (Free)

1. Browser mein jayein: **https://console.firebase.google.com**
2. Google account se login karein
3. **"Add Project"** (ya "Create a project") pe click karein
4. Project ka naam dein (jaise `tasty-food-point`) → **Continue**
5. Google Analytics ka option **off/skip** kar dein (zaroori nahi) → **Create Project**

---

## Step 2: Web App Register Karein

1. Project dashboard khulne ke baad, **`</>`** (Web) icon pe click karein
2. App ka nickname dein (jaise "Tasty Food Point Web") → **Register App**
3. Ab jo code screen pe dikhega, usme se sirf ye wala hissa copy karein:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

4. Isko apni `firebase-config.js` file mein paste kar dein (placeholder values ki jagah)
5. **Continue to Console** pe click karein

---

## Step 3: Firestore Database On Karein

1. Left menu mein **"Build" > "Firestore Database"** pe jayein
2. **"Create Database"** click karein
3. Location select karein (koi bhi nearby, jaise `asia-south1`) → Next
4. **"Start in production mode"** select karein → Enable

### Security Rules Set Karein

1. Firestore ke andar **"Rules"** tab pe jayein
2. Neeche di gayi rules paste kar dein (purani rules replace kar dein):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /menuItems/{itemId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

3. **Publish** pe click karein

*(Ye rule ka matlab: koi bhi menu dekh sakta hai, lekin sirf logged-in admin hi items change kar sakta hai.)*

---

## Step 4: Admin Login Banayein

1. Left menu mein **"Build" > "Authentication"** pe jayein
2. **"Get Started"** click karein
3. **"Email/Password"** provider pe click karein → **Enable** → Save
4. **"Users"** tab pe jayein → **"Add User"**
5. Apna admin email aur password dein (yehi `admin.html` mein login karne ke liye use hoga)

---

## Step 5: Files Upload Karein

Apni hosting/folder mein ye sab files hona chahiye (same folder):

- `index.html`
- `admin.html`
- `style.css`
- `script.js`
- `admin.js`
- `firebase-config.js` (jisme aapne Step 2 ka config paste kiya)

---

## Ab Kaise Use Karein

1. `admin.html` open karein
2. Apna email/password se login karein
3. Pehli baar login karte hi, aapke **9 purane menu items automatically** load ho jayenge
4. Yahan se aap:
   - Kisi bhi item ko **In Stock / Out of Stock** switch se turant on/off kar sakte hain
   - **Edit** button se naam, price, ya image badal sakte hain
   - **Delete** button se item hata sakte hain
   - Upar wale form se **naya item add** kar sakte hain
5. Ye sab changes **turant** har customer ki `index.html` pe reflect hongi — koi refresh/redeploy nahi chahiye

---

## Note

- Agar `admin.html` khulte hi error aaye ("Menu load nahi ho saka"), to check karein `firebase-config.js` mein sahi values pasted hain
- Password kisi ko na dein — jo bhi login karega wo menu edit kar sakta hai
