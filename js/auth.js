/* =====================================================
   SOVT
   AUTH.JS
   Firebase Authentication
===================================================== */

(function () {

    "use strict";


    /* =================================================
       FIREBASE CONFIG
    ================================================= */

    const firebaseConfig = {

        apiKey:
            "AIzaSyALbPr2kBfrDKmtLlAkwq92_jKzegE2k6M",

        authDomain:
            "sovt-8e674.firebaseapp.com",

        projectId:
            "sovt-8e674",

        storageBucket:
            "sovt-8e674.firebasestorage.app",

        messagingSenderId:
            "153910651650",

        appId:
            "1:153910651650:web:2f6b365acff4e6de3c301b",

        measurementId:
            "G-N5TCR9XS24"

    };


    /* =================================================
       FIREBASE SDK
    ================================================= */

    import(
        "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"
    )
    .then(async function (firebaseAppModule) {

        const {
            initializeApp
        } = firebaseAppModule;


        const firebaseAuthModule =
            await import(
                "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"
            );


        const {

            getAuth,

            onAuthStateChanged,

            signOut,

            signInWithEmailAndPassword,

            createUserWithEmailAndPassword,

            GoogleAuthProvider,

            GithubAuthProvider,

            signInWithPopup

        } = firebaseAuthModule;


        /* =============================================
           INITIALIZE FIREBASE
        ============================================= */

        const app =
            initializeApp(firebaseConfig);


        const auth =
            getAuth(app);


        window.firebaseApp =
            app;


        window.firebaseAuth =
            auth;


        /* =============================================
           PROVIDERS
        ============================================= */

        const googleProvider =
            new GoogleAuthProvider();


        const githubProvider =
            new GithubAuthProvider();


        /* =============================================
           UPDATE AUTH UI
        ============================================= */

        async function updateAuthUI(user) {

            const loginButton =
                document.getElementById(
                    "loginButton"
                );


            const authArea =
                document.getElementById(
                    "authArea"
                );


            if (user) {

                localStorage.setItem(
                    "itachi_logged_in",
                    "true"
                );


                if (loginButton) {

                    loginButton.textContent =
                        "حسابي";


                    loginButton.onclick =
                        function () {

                            window.location.href =
                                "profile.html";

                        };

                }


                if (authArea) {

                    authArea.innerHTML = `

                        <button
                            class="menu-link"
                            type="button"
                            onclick="goTo('dashboard.html')"
                        >
                            <span>
                                لوحة التحكم
                            </span>
                        </button>

                        <button
                            class="menu-link"
                            type="button"
                            onclick="goTo('profile.html')"
                        >
                            <span>
                                الملف الشخصي
                            </span>
                        </button>

                        <button
                            class="menu-link"
                            type="button"
                            onclick="goTo('settings.html')"
                        >
                            <span>
                                الإعدادات
                            </span>
                        </button>

                        <button
                            class="menu-link"
                            type="button"
                            onclick="logout()"
                        >
                            <span>
                                تسجيل الخروج
                            </span>
                        </button>

                    `;

                }

            }

            else {

                localStorage.removeItem(
                    "itachi_logged_in"
                );


                if (loginButton) {

                    loginButton.textContent =
                        "تسجيل الدخول";


                    loginButton.onclick =
                        function () {

                            window.location.href =
                                "login.html";

                        };

                }


                if (authArea) {

                    authArea.innerHTML = `

                        <p class="auth-message">
                            سجّل الدخول أو أنشئ
                            حسابًا للوصول إلى حسابك.
                        </p>

                        <button
                            class="auth-button"
                            type="button"
                            onclick="goToLogin()"
                        >
                            تسجيل الدخول
                        </button>

                        <button
                            class="auth-button register-button"
                            type="button"
                            onclick="goToRegister()"
                        >
                            إنشاء حساب
                        </button>

                    `;

                }

            }

        }


        /* =============================================
           LOGOUT
        ============================================= */

        window.logout =
            async function () {

                try {

                    await signOut(auth);


                    localStorage.removeItem(
                        "itachi_logged_in"
                    );


                    window.location.href =
                        "index.html";

                }

                catch (error) {

                    console.error(
                        "FIREBASE LOGOUT ERROR:",
                        error
                    );

                }

            };


        /* =============================================
           CURRENT USER
        ============================================= */

        window.getCurrentUser =
            function () {

                return auth.currentUser;

            };


        /* =============================================
           AUTH STATE
        ============================================= */

        onAuthStateChanged(
            auth,
            function (user) {

                updateAuthUI(user);

            }
        );


        /* =============================================
           FIREBASE ACCESS
        ============================================= */

        window.SOVTFirebase = {

            auth,

            googleProvider,

            githubProvider,

            signInWithEmailAndPassword,

            createUserWithEmailAndPassword,

            signInWithPopup

        };


        console.log(
            "SOVT Firebase Authentication جاهز ✔️"
        );

    })


    .catch(function (error) {

        console.error(
            "تعذر تحميل Firebase Authentication:",
            error
        );

    });


})();
