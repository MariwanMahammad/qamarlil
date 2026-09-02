import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    setDoc,
    query, 
    where, 
    serverTimestamp, 
    updateDoc,
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAusWG2t3eEDGnr59bI3HOTzx4IaVTzuw4",
    authDomain: "qamarlilsystem.firebaseapp.com",
    projectId: "qamarlilsystem",
    storageBucket: "qamarlilsystem.firebasestorage.app",
    messagingSenderId: "785931927240",
    appId: "1:785931927240:web:3b3f97838d5b978a702ffd",
    measurementId: "G-5LNCHJ5TE5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = "admin@qamarlil.com";
let currentUser = null;
let sessionUnsubscribe = null;

// گرێدانی فۆرمی چوونەژوورەوە بە شێوازێکی دروست
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    handleLogin();
});

document.getElementById('logoutBtn').addEventListener('click', handleLogout);
document.getElementById('submitLeaveBtn').addEventListener('click', submitEmployeeLeaveRequest);

const createEmpBtn = document.getElementById('createEmployeeBtn');
if (createEmpBtn) {
    createEmpBtn.addEventListener('click', handleCreateEmployee);
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // دروستکردن یان نوێکردنەوەی تەکنیی سەشنی چالاک (بۆ دەرکردنی لۆگینی تر لە شوێنی تر)
        const sessionToken = Date.now().toString() + Math.random().toString();
        localStorage.setItem('qamar_session', sessionToken);

        try {
            await setDoc(doc(db, 'activeSessions', user.uid), {
                token: sessionToken,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error("Session sync error:", e);
        }

        // چاودێریکردنی ڕاستەوخۆی سەشن (ئەگەر لە جێگەی تر لۆگین کرا، ئەمە یەکسەر دەرمان دەکات)
        if (sessionUnsubscribe) sessionUnsubscribe();
        sessionUnsubscribe = onSnapshot(doc(db, 'activeSessions', user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const serverToken = docSnap.data().token;
                const localToken = localStorage.getItem('qamar_session');
                if (serverToken && localToken && serverToken !== localToken) {
                    alert('ئاگاداری: ئەم ئەکاونتە لە شوێنێکی ترەوە (لابتۆپ یان مۆبایلی تر) چوەتە ژوورەوە، بۆیە لێرە لۆگ آوت (Logout) کرایت!');
                    signOut(auth);
                }
            }
        });

        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('mainDashboard').classList.remove('hidden');
        
        if (user.email === ADMIN_EMAIL) {
            document.getElementById('adminSection').classList.remove('hidden');
            document.getElementById('employeeSection').classList.add('hidden');
            document.getElementById('userRoleWelcome').innerText = "بەخێرهاتیت بەرپرسی نوسینگە (ئەدمین)";
            loadAdminRequests();
        } else {
            document.getElementById('adminSection').classList.add('hidden');
            document.getElementById('employeeSection').classList.remove('hidden');
            document.getElementById('userRoleWelcome').innerText = `بەخێرهاتیت کارمەند: ${user.email}`;
            loadMyRequests();
        }
    } else {
        currentUser = null;
        if (sessionUnsubscribe) {
            sessionUnsubscribe();
            sessionUnsubscribe = null;
        }
        document.getElementById('loginView').classList.remove('hidden');
        document.getElementById('mainDashboard').classList.add('hidden');
    }
});

function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) return alert('تکایە ئیمێڵ و پاسوورد بنووسە');

    signInWithEmailAndPassword(auth, email, password)
        .catch(error => {
            alert('هەڵە لە چوونەژوورەوە: ' + error.message);
        });
}

function handleLogout() {
    signOut(auth);
}

async function handleCreateEmployee() {
    const email = document.getElementById('newEmpEmail').value.trim();
    const password = document.getElementById('newEmpPassword').value.trim();

    if (!email || !password) {
        alert('تکایە ئیمێڵ و پاسووردی کارمەند بنووسە');
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('کارمەندەکە بە سەرکەوتوویی دروستکرا!');
        document.getElementById('newEmpEmail').value = '';
        document.getElementById('newEmpPassword').value = '';
    } catch (error) {
        alert('هەڵە لە دروستکردنی کارمەند: ' + error.message);
    }
}

window.toggleEmpFields = function() {
    const category = document.getElementById('empLeaveCategory').value;
    if (category === 'زەمەنی') {
        document.getElementById('empHourlyGroup').classList.remove('hidden');
        document.getElementById('empDailyGroup').classList.add('hidden');
    } else {
        document.getElementById('empHourlyGroup').classList.add('hidden');
        document.getElementById('empDailyGroup').classList.remove('hidden');
    }
};

async function submitEmployeeLeaveRequest() {
    const category = document.getElementById('empLeaveCategory').value;
    const date = document.getElementById('empLeaveDate').value;
    const reason = document.getElementById('empLeaveReason').value.trim();

    if (!date) return alert('تکایە بەروار دیاری بکە');

    let details = '';
    if (category === 'زەمەنی') {
        const start = document.getElementById('empStartTime').value;
        const end = document.getElementById('empEndTime').value;
        if (!start || !end) return alert('سەعاتی دەستپێک و کۆتایی دیاری بکە');
        details = `لە سەعات ${start} بۆ ${end}`;
    } else {
        const days = document.getElementById('empLeaveDays').value;
        details = `${days} ڕۆژ`;
    }

    try {
        await addDoc(collection(db, 'leaves'), {
            empEmail: currentUser.email,
            type: category,
            details: details,
            date: date,
            reason: reason || '---',
            status: 'چاوەڕوانکراو',
            adminNote: '---',
            createdAt: serverTimestamp()
        });
        alert('داواکارییەکەت بە سەرکەوتوویی نێردرا بۆ ئەدمین!');
        document.getElementById('empLeaveReason').value = '';
        loadMyRequests();
    } catch (error) {
        alert('هەڵە ڕویدا: ' + error.message);
    }
}

async function loadMyRequests() {
    const tbody = document.getElementById('myRequestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    try {
        const q = query(collection(db, 'leaves'), where('empEmail', '==', currentUser.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="color: #64748b;">هیچ داواکارییەک ناتۆمارکراوە</td></tr>`;
            return;
        }

        querySnapshot.forEach(docSnap => {
            const l = docSnap.data();
            let badgeStyle = "background: #fef08a; color: #854d0e; padding: 3px 8px; border-radius: 4px;";
            if (l.status === 'قبوڵکراوە') badgeStyle = "background: #bbf7d0; color: #166534; padding: 3px 8px; border-radius: 4px;";
            if (l.status === 'ڕەتکرایەوە') badgeStyle = "background: #fecaca; color: #991b1b; padding: 3px 8px; border-radius: 4px;";

            tbody.innerHTML += `
                <tr>
                    <td>${l.type}</td>
                    <td>${l.details}</td>
                    <td>${l.date}</td>
                    <td>${l.reason}</td>
                    <td><span style="${badgeStyle}">${l.status}</span></td>
                    <td>${l.adminNote}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error(error);
    }
}

async function loadAdminRequests() {
    const tbody = document.getElementById('adminRequestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    try {
        const q = query(collection(db, 'leaves'), where('status', '==', 'چاوەڕوانکراو'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="color: #64748b;">هیچ داواکارییەکی چاوەڕوانکراو نییە</td></tr>`;
            return;
        }

        querySnapshot.forEach(docSnap => {
            const l = docSnap.data();
            const id = docSnap.id;
            tbody.innerHTML += `
                <tr>
                    <td><strong>${l.empEmail}</strong></td>
                    <td>${l.type}</td>
                    <td>${l.details}</td>
                    <td>${l.date}</td>
                    <td>${l.reason}</td>
                    <td>
                        <button class="accept-btn" data-id="${id}" style="background: #10b981; padding: 5px 10px; font-size: 12px; color:white; border:none; border-radius:4px; cursor:pointer;">قبوڵکردن</button>
                        <button class="reject-btn" data-id="${id}" style="background: #ef4444; padding: 5px 10px; font-size: 12px; color:white; border:none; border-radius:4px; cursor:pointer;">ڕەتکردنەوە</button>
                    </td>
                </tr>
            `;
        });

        document.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', (e) => updateLeaveStatus(e.target.dataset.id, 'قبوڵکراوە', 'قبوڵکرا'));
        });
        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const reason = prompt('هۆکاری ڕەتکردنەوەی ئەم مۆڵەتە بنووسە بۆ کارمەندەکە:');
                if (reason !== null) {
                    updateLeaveStatus(id, 'ڕەتکرایەوە', reason);
                }
            });
        });

    } catch (error) {
        console.error(error);
    }
}

async function updateLeaveStatus(id, status, note) {
    try {
        const leaveRef = doc(db, 'leaves', id);
        await updateDoc(leaveRef, {
            status: status,
            adminNote: note
        });
        alert('بڕیارەکە تۆمارکرا!');
        loadAdminRequests();
    } catch (error) {
        alert('هەڵە ڕویدا: ' + error.message);
    }
}