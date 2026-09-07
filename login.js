document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById('loginBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');

            const email = emailInput ? emailInput.value.trim() : '';
            const pass = passwordInput ? passwordInput.value.trim() : '';

            if (email === 'admin@qamarlil.com' && pass === '123456') {
                localStorage.setItem('currentUser', JSON.stringify({ email: email }));
                // گواستنەوە بۆ داشبورد کاتێک لۆگین سەرکەوتوو دەبێت
                window.location.href = 'dashboard.html';
            } else {
                alert('ئیمێڵ یان وشەی نهێنی هەڵەیە!');
            }
        });
    }
});