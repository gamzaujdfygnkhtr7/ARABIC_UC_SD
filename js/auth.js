/* =====================================================
   ARABIC_UCH_SD
   AUTH.JS
   نظام تسجيل الدخول والحسابات
===================================================== */

(function () {

    "use strict";


    /* =================================================
       SUPABASE CONFIG
    ================================================= */

    const SUPABASE_URL =
        "https://oqrdadmfpwgrfcphddbu.supabase.co";

    const SUPABASE_ANON_KEY =
        "sb_publishable_gHcWL0VoJXUTL4JXGZilZA_na0KSJQZ";


    /* =================================================
       CHECK SUPABASE
    ================================================= */

    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Supabase لم يتم تحميله بشكل صحيح."
        );

        return;
    }


    /* =================================================
       CREATE CLIENT
    ================================================= */

    const supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY
        );


    /* =================================================
       MAKE CLIENT AVAILABLE
    ================================================= */

    window.supabaseClient =
        supabaseClient;


    /* =================================================
       UPDATE LOGIN UI
    ================================================= */

    async function updateAuthUI() {

        try {

            const {
                data: {
                    user
                }
            } =
                await supabaseClient.auth.getUser();


            const loginButton =
                document.getElementById(
                    "loginButton"
                );


            const authArea =
                document.getElementById(
                    "authArea"
                );


            /* =========================================
               USER LOGGED IN
            ========================================= */

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

            /* =========================================
               USER NOT LOGGED IN
            ========================================= */

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

        catch (error) {

            console.error(
                "خطأ في التحقق من المستخدم:",
                error
            );

        }

    }


    /* =================================================
       LOGOUT
    ================================================= */

    window.logout =
        async function () {

            try {

                await supabaseClient.auth.signOut();

                localStorage.removeItem(
                    "itachi_logged_in"
                );

                window.location.href =
                    "index.html";

            }

            catch (error) {

                console.error(
                    "خطأ أثناء تسجيل الخروج:",
                    error
                );

            }

        };


    /* =================================================
       GET CURRENT USER
    ================================================= */

    window.getCurrentUser =
        async function () {

            const {
                data: {
                    user
                }
            } =
                await supabaseClient.auth.getUser();


            return user;

        };


    /* =================================================
       AUTH STATE LISTENER
    ================================================= */

    supabaseClient.auth.onAuthStateChange(
        function (
            event,
            session
        ) {

            if (session) {

                localStorage.setItem(
                    "itachi_logged_in",
                    "true"
                );

            }

            else {

                localStorage.removeItem(
                    "itachi_logged_in"
                );

            }


            updateAuthUI();

        }
    );


    /* =================================================
       START
    ================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            updateAuthUI
        );

    }

    else {

        updateAuthUI();

    }


})();