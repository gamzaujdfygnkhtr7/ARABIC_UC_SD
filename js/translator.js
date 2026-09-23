/* =========================================================
   SOVT TRANSLATOR ENGINE
   V1.5
   Dictionary + Smart Selection + API
========================================================= */

class TranslatorEngine {

    constructor(
        dictionaryUrl = "./data/ITACHI_DICTIONARY.tsv",
        apiUrl = "/api"
    ) {

        this.dictionaryUrl = dictionaryUrl;

        this.apiUrl = apiUrl;

        this.dictionary = new Map();

        this.loaded = false;

        this.loading = null;
    }


    /* =====================================================
       LOAD DICTIONARY
    ===================================================== */

    async load() {

        if (this.loaded) {
            return true;
        }

        if (this.loading) {
            return this.loading;
        }

        this.loading = (async () => {

            try {

                const response = await fetch(
                    this.dictionaryUrl,
                    {
                        cache: "no-cache"
                    }
                );

                if (!response.ok) {

                    throw new Error(
                        "Failed to load dictionary."
                    );

                }

                const text =
                    await response.text();

                this.parseTSV(text);

                this.loaded = true;

                console.log(
                    "SOVT Dictionary Loaded:",
                    this.dictionary.size
                );

                return true;

            } finally {

                this.loading = null;

            }

        })();

        return this.loading;
    }


    /* =====================================================
       NORMALIZE
    ===================================================== */

    normalize(text) {

        if (typeof text !== "string") {
            return "";
        }

        let value = text
            .replace(/^\uFEFF/, "")
            .trim()
            .replace(/\s+/g, " ");


        value = value
            .replace(/[إأآٱ]/g, "ا")
            .replace(/ى/g, "ي")
            .replace(/ؤ/g, "و")
            .replace(/ئ/g, "ي");


        value = value.replace(
            /[\u064B-\u065F\u0670]/g,
            ""
        );


        value = value.replace(
            /ـ+/g,
            ""
        );


        value = value.replace(
            /([\u0621-\u064A])\1{2,}/g,
            "$1$1"
        );


        value = value.replace(
            /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~،؛؟«»“”‘’…]+/g,
            " "
        );


        return value
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }


    /* =====================================================
       PARSE TSV
    ===================================================== */

    parseTSV(text) {

        const lines =
            text.split(/\r?\n/);

        for (const line of lines) {

            if (!line.trim()) {
                continue;
            }

            const separator =
                line.indexOf("\t");

            if (separator === -1) {
                continue;
            }

            const source =
                line.slice(
                    0,
                    separator
                ).trim();

            const target =
                line.slice(
                    separator + 1
                ).trim();

            if (!source || !target) {
                continue;
            }

            const key =
                this.normalize(source);

            if (!this.dictionary.has(key)) {

                this.dictionary.set(
                    key,
                    new Set()
                );

            }

            this.dictionary
                .get(key)
                .add(target);
        }
    }


    /* =====================================================
       EXACT SEARCH
    ===================================================== */

    findExact(text) {

        const key =
            this.normalize(text);

        const results =
            this.dictionary.get(key);

        if (!results) {
            return [];
        }

        return Array.from(results);
    }


    /* =====================================================
       SCORE
    ===================================================== */

    scoreTranslation(
        original,
        candidate,
        options = {}
    ) {

        const originalNormalized =
            this.normalize(original);

        const candidateNormalized =
            this.normalize(candidate);

        let score = 0;


        if (
            originalNormalized ===
            candidateNormalized
        ) {

            score += 1000;

        }


        const originalWords =
            originalNormalized
                .split(" ")
                .filter(Boolean);

        const candidateWords =
            candidateNormalized
                .split(" ")
                .filter(Boolean);


        if (
            originalWords.length ===
            candidateWords.length
        ) {

            score += 100;

        }


        score += Math.min(
            candidateWords.length * 10,
            100
        );


        if (options.target === "ar") {

            if (
                /[\u0600-\u06FF]/
                    .test(candidate)
            ) {

                score += 30;

            }

        }


        if (options.target === "en") {

            if (
                /^[\x00-\x7F]+$/
                    .test(candidate)
            ) {

                score += 30;

            }

        }


        return score;
    }


    /* =====================================================
       CHOOSE BEST
    ===================================================== */

    chooseBest(
        original,
        translations,
        options = {}
    ) {

        if (
            !Array.isArray(translations) ||
            !translations.length
        ) {

            return null;

        }


        const scored =
            translations.map(
                translation => ({

                    translation,

                    score:
                        this.scoreTranslation(
                            original,
                            translation,
                            options
                        )

                })
            );


        scored.sort(
            (a, b) =>
                b.score - a.score
        );


        return scored[0];
    }


    /* =====================================================
       API REQUEST
    ===================================================== */

    async apiTranslate(
        text,
        source,
        target
    ) {

        const response =
            await fetch(
                this.apiUrl +
                "/translate",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        text,

                        source,

                        target

                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                "SOVT API request failed."
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.error ||
                "SOVT API translation failed."
            );

        }


        return data;
    }


    /* =====================================================
       GOOGLE FALLBACK
    ===================================================== */

    async googleTranslate(
        text,
        source = "auto",
        target = "en"
    ) {

        const url =
            "https://translate.googleapis.com/" +
            "translate_a/single" +
            "?client=gtx" +
            "&sl=" +
            encodeURIComponent(source) +
            "&tl=" +
            encodeURIComponent(target) +
            "&dt=t" +
            "&q=" +
            encodeURIComponent(text);


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "External translation failed."
            );

        }


        const data =
            await response.json();


        if (
            !Array.isArray(data) ||
            !Array.isArray(data[0])
        ) {

            throw new Error(
                "Invalid translation response."
            );

        }


        const translation =
            data[0]
                .map(
                    part => part[0] || ""
                )
                .join("");


        if (!translation.trim()) {

            throw new Error(
                "Empty translation."
            );

        }


        return translation.trim();
    }


    /* =====================================================
       MAIN TRANSLATION
    ===================================================== */

    async translate(
        text,
        options = {}
    ) {

        await this.load();


        if (
            typeof text !== "string" ||
            !text.trim()
        ) {

            return {

                success: false,

                type: "invalid_input",

                translations: []

            };
        }


        const source =
            options.source || "auto";

        const target =
            options.target || "en";


        /* ---------------------------------------------
           1. LOCAL DICTIONARY
        --------------------------------------------- */

        const localTranslations =
            this.findExact(text);


        if (localTranslations.length) {

            const best =
                this.chooseBest(
                    text,
                    localTranslations,
                    {
                        source,
                        target
                    }
                );


            if (best) {

                return {

                    success: true,

                    type: "exact",

                    translations: [
                        best.translation
                    ],

                    score:
                        best.score,

                    source:
                        "dictionary",

                    api:
                        false

                };
            }
        }


        /* ---------------------------------------------
           2. SOVT API
        --------------------------------------------- */

        try {

            const apiResult =
                await this.apiTranslate(
                    text,
                    source,
                    target
                );


            return {

                success: true,

                type:
                    apiResult.type ||
                    "external",

                translations: [
                    apiResult.translation
                ],

                source:
                    "api",

                cached:
                    apiResult.cached === true,

                api:
                    true

            };

        } catch (apiError) {

            console.warn(
                "SOVT API unavailable:",
                apiError
            );

        }


        /* ---------------------------------------------
           3. DIRECT EXTERNAL FALLBACK
        --------------------------------------------- */

        try {

            const translation =
                await this.googleTranslate(
                    text,
                    source,
                    target
                );


            return {

                success: true,

                type: "external",

                translations: [
                    translation
                ],

                source:
                    "external",

                api:
                    false

            };

        } catch (error) {

            return {

                success: false,

                type:
                    "external_error",

                translations: [],

                error:
                    error.message

            };
        }
    }


    /* =====================================================
       DICTIONARY SIZE
    ===================================================== */

    getSize() {

        return this.dictionary.size;
    }
}


/* =========================================================
   GLOBAL ENGINE
========================================================= */

const translator =
    new TranslatorEngine(
        "./data/ITACHI_DICTIONARY.tsv",
        "/api"
    );


window.TranslatorEngine =
    TranslatorEngine;

window.translator =
    translator;


/* =========================================================
   AUTO LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        try {

            await translator.load();

            console.log(
                "SOVT Translator Ready."
            );

            console.log(
                "Dictionary entries:",
                translator.getSize()
            );

        } catch (error) {

            console.error(
                "SOVT startup error:",
                error
            );

        }

    }
);
