const firebaseConfig = {
  apiKey:            "AIzaSyBSkmCj4A3kZSM-3abuGc_9Wm4q9lwHdKA",
  authDomain:        "invitatii-cu-dichis.firebaseapp.com",
  projectId:         "invitatii-cu-dichis",
  storageBucket:     "invitatii-cu-dichis.firebasestorage.app",
  messagingSenderId: "12376262017",
  appId:             "1:12376262017:web:5e7a957c834f3fd6c55480"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
