/*
 * SOVT AUTH
 * Firebase Authentication
 * Email + Google + GitHub
 */

(function () {

    "use strict";


    /* ================================
       FIREBASE CONFIG
    ================================= */

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


    /* ================================
       STATE
    ================================= */

    let firebaseApp = null;
    let firebaseAuth = null;

    let firebaseReady = false;
    let firebasePromise = null;


    /* ================================
       LOAD SCRIPT
    ================================= */

    function loadScript(src) {

        return new Promise(function (resolve, reject) {

            const existing =
                document.querySelector(
                    'script[src="' + src + '"]'
                );

            if (existing) {

                if (existing.dataset.loaded === "true") {

                    resolve();

                    return;
                }

                existing.addEventListener(
                    "load",
                    resolve,
                    { once: true }
                );

                existing.addEventListener(
                    "error",
                    reject,
                    { once: true }
                );

                return;
            }


            const script =
                document.createElement("script");

            script.src = src;

            script.async = true;

            script.onload = function () {

                script.dataset.loaded = "true";

                resolve();

            };

            script.onerror = function () {

                reject(
                    new Error(
                        "تعذر تحميل Firebase: " + src
                    )
                );

            };


            document.head.appendChild(script);

        });

    }


    /* ================================
       INITIALIZE FIREBASE
    ================================= */

    async function initializeFirebase() {

        if (firebaseReady) {

            return {

                app: firebaseApp,

                auth: firebaseAuth

            };

        }


        if (firebasePromise) {

            return firebasePromise;

        }


        firebasePromise =
            (async function () {

                try {

                    /*
                     * Firebase App
                     */

                    await loadScript(
                        "https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js"
                    );


                    /*
                     * Firebase Authentication
                     */

                    await loadScript(
                        "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js"
                    );


                    /*
                     * Check Firebase
                     */

                    if (
                        !window.firebase ||
                        typeof window.firebase.initializeApp !== "function"
                    ) {

                        throw new Error(
                            "Firebase SDK لم يتم تحميله."
                        );

                    }


                    /*
                     * Initialize App
                     */

                    if (
                        window.firebase.apps &&
                        window.firebase.apps.length > 0
                    ) {

                        firebaseApp =
                            window.firebase.apps[0];

                    } else {

                        firebaseApp =
                            window.firebase.initializeApp(
                                firebaseConfig
                            );

                    }


                    /*
                     * Auth
                     */

                    firebaseAuth =
                        window.firebase.auth();


                    /*
                     * Providers
                     */

                    window.SOVTGoogleProvider =
                        new window.firebase.auth.GoogleAuthProvider();


                    window.SOVTGitHubProvider =
                        new window.firebase.auth.GithubAuthProvider();


                    /*
                     * Persistence
                     */

                    await firebaseAuth.setPersistence(
                        window.firebase.auth.Auth.Persistence.LOCAL
                    );


                    firebaseReady = true;


                    /*
                     * Global
                     */

                    window.firebaseApp =
                        firebaseApp;

                    window.firebaseAuth =
                        firebaseAuth;


                    console.log(
                        "SOVT Firebase: READY"
                    );


                    return {

                        app: firebaseApp,

                        auth: firebaseAuth

                    };


                } catch (error) {

                    console.error(
                        "SOVT FIREBASE ERROR:",
                        error
                    );


                    firebaseReady = false;

                    firebasePromise = null;

                    throw error;

                }

            })();


        return firebasePromise;

    }


    /* ================================
       READY
    ================================= */

    async function ready() {

        return await initializeFirebase();

    }


    /* ================================
       CURRENT USER
    ================================= */

    async function getCurrentUser() {

        await initializeFirebase();

        return new Promise(function (resolve) {

            const unsubscribe =
                firebaseAuth.onAuthStateChanged(
                    function (user) {

                        unsubscribe();

                        resolve(user || null);

                    }
                );

        });

    }


    /* ================================
       EMAIL REGISTER
    ================================= */

    async function registerWithEmail(
        email,
        password,
        username
    ) {

        await initializeFirebase();


        const result =
            await firebaseAuth.createUserWithEmailAndPassword(
                email,
                password
            );


        const user =
            result.user;


        if (user && username) {

            await user.updateProfile({

                displayName:
                    username

            });

        }


        return user;

    }


    /* ================================
       EMAIL LOGIN
    ================================= */

    async function loginWithEmail(
        email,
        password
    ) {

        await initializeFirebase();


        const result =
            await firebaseAuth.signInWithEmailAndPassword(
                email,
                password
            );


        return result.user;

    }


    /* ================================
       GOOGLE LOGIN
    ================================= */

    async function googleLogin() {

        await initializeFirebase();


        const result =
            await firebaseAuth.signInWithPopup(
                window.SOVTGoogleProvider
            );


        return result.user;

    }


    /* ================================
       GITHUB LOGIN
    ================================= */

    async function githubLogin() {

        await initializeFirebase();


        const result =
            await firebaseAuth.signInWithPopup(
                window.SOVTGitHubProvider
            );


        return result.user;

    }


    /* ================================
       LOGOUT
    ================================= */

    async function logout() {

        await initializeFirebase();


        await firebaseAuth.signOut();


        localStorage.removeItem(
            "itachi_logged_in"
        );

    }


    /* ================================
       AUTH STATE
    ================================= */

    async function listenAuthState(
        callback
    ) {

        await initializeFirebase();


        return firebaseAuth.onAuthStateChanged(
            function (user) {

                if (user) {

                    localStorage.setItem(
                        "itachi_logged_in",
                        "true"
                    );

                } else {

                    localStorage.removeItem(
                        "itachi_logged_in"
                    );

                }


                if (
                    typeof callback === "function"
                ) {

                    callback(user);

                }

            }
        );

    }


    /* ================================
       GLOBAL SOVT API
    ================================= */

    window.SOVTFirebase = {

        ready:

            ready,

        getCurrentUser:

            getCurrentUser,

        registerWithEmail:

            registerWithEmail,

        loginWithEmail:

            loginWithEmail,

        googleLogin:

            googleLogin,

        githubLogin:

            githubLogin,

        logout:

            logout,

        listenAuthState:

            listenAuthState

    };


    /*
     * Start Firebase immediately.
     * Errors are logged but do not
     * break the page.
     */

    initializeFirebase()
        .catch(function (error) {

            console.error(
                "SOVT Firebase initialization failed:",
                error
            );

        });


})();
