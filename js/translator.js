/* =========================================================
   SOVT TRANSLATOR ENGINE
   V1.3 — Smart Translation Selection
========================================================= */

class TranslatorEngine {

    constructor(
        dictionaryUrl = "./data/ITACHI_DICTIONARY.tsv"
    ) {

        this.dictionaryUrl = dictionaryUrl;

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

            } catch (error) {

                console.error(
                    "SOVT Dictionary Error:",
                    error
                );

                throw error;

            } finally {

                this.loading = null;

            }

        })();

        return this.loading;
    }


    /* =====================================================
       NORMALIZATION
    ===================================================== */

    normalize(text) {

        if (typeof text !== "string") {
            return "";
        }

        let value = text;

        value = value
            .replace(/^\uFEFF/, "")
            .trim()
            .replace(/\s+/g, " ");

        /* Arabic normalization */

        value = value
            .replace(/[إأآٱ]/g, "ا")
            .replace(/ى/g, "ي")
            .replace(/ؤ/g, "و")
            .replace(/ئ/g, "ي");

        /* Remove Arabic diacritics */

        value = value.replace(
            /[\u064B-\u065F\u0670]/g,
            ""
        );

        /* Reduce exaggerated repeated letters */

        value = value.replace(
            /([\u0621-\u064A])\1{2,}/g,
            "$1$1"
        );

        return value.toLowerCase();
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

            if (!key) {
                continue;
            }

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
       PARTIAL SEARCH
    ===================================================== */

    findParts(text) {

        const normalized =
            this.normalize(text);

        if (!normalized) {
            return [];
        }

        const words =
            normalized.split(" ");

        const results = [];

        for (const [key, translations] of this.dictionary) {

            const keyWords =
                key.split(" ");

            let matches = 0;

            for (const word of words) {

                if (
                    keyWords.includes(word)
                ) {

                    matches++;

                }

            }

            if (matches > 0) {

                results.push({

                    key: key,

                    translations:
                        Array.from(translations),

                    matches: matches,

                    totalWords:
                        words.length,

                    keyWords:
                        keyWords.length

                });

            }

        }

        return results;
    }


    /* =====================================================
       SMART SCORE
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


        /* ---------------------------------------------
           Exact text
        --------------------------------------------- */

        if (
            originalNormalized ===
            candidateNormalized
        ) {

            score += 1000;

        }


        /* ---------------------------------------------
           Exact word count
        --------------------------------------------- */

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


        /* ---------------------------------------------
           Word overlap
        --------------------------------------------- */

        const candidateSet =
            new Set(candidateWords);

        let overlap = 0;

        for (const word of originalWords) {

            if (candidateSet.has(word)) {
                overlap++;
            }

        }

        score +=
            overlap * 20;


        /* ---------------------------------------------
           Prefer longer meaningful matches
        --------------------------------------------- */

        score +=
            Math.min(
                originalNormalized.length,
                50
            );


        /* ---------------------------------------------
           Target language preference
        --------------------------------------------- */

        if (options.target) {

            if (
                options.target === "ar" &&
                /[\u0600-\u06FF]/.test(candidate)
            ) {

                score += 30;

            }

            if (
                options.target === "en" &&
                /^[\x00-\x7F]+$/.test(candidate)
            ) {

                score += 30;

            }

        }


        return score;
    }


    /* =====================================================
       CHOOSE BEST TRANSLATION
    ===================================================== */

    chooseBest(
        original,
        translations,
        options = {}
    ) {

        if (
            !Array.isArray(translations) ||
            translations.length === 0
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
       SMART EXACT
    ===================================================== */

    findSmart(
        text,
        options = {}
    ) {

        const translations =
            this.findExact(text);

        if (!translations.length) {

            return null;

        }

        return this.chooseBest(
            text,
            translations,
            options
        );

    }


    /* =====================================================
       GOOGLE TRANSLATE
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
                .map(part => part[0] || "")
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
           1. SEARCH DICTIONARY
        --------------------------------------------- */

        const smartResult =
            this.findSmart(
                text,
                {
                    source,
                    target
                }
            );


        if (smartResult) {

            return {

                success: true,

                type: "exact",

                translations: [
                    smartResult.translation
                ],

                score:
                    smartResult.score,

                source: "dictionary",

                needsExternalTranslation: false

            };

        }


        /* ---------------------------------------------
           2. PARTIAL DICTIONARY MATCH
        --------------------------------------------- */

        const parts =
            this.findParts(text);


        if (parts.length) {

            const collected = [];


            for (const part of parts) {

                const best =
                    this.chooseBest(
                        text,
                        part.translations,
                        {
                            source,
                            target
                        }
                    );


                if (best) {

                    collected.push({

                        source:
                            part.key,

                        translation:
                            best.translation,

                        score:
                            best.score,

                        matches:
                            part.matches

                    });

                }

            }


            collected.sort(
                (a, b) =>
                    b.score - a.score
            );


            /* -----------------------------------------
               If partial result is useful
            ----------------------------------------- */

            if (collected.length) {

                try {

                    const external =
                        await this.googleTranslate(
                            text,
                            source,
                            target
                        );


                    return {

                        success: true,

                        type: "external",

                        translations: [
                            external
                        ],

                        dictionaryMatches:
                            collected,

                        source:
                            "external",

                        needsExternalTranslation:
                            false

                    };

                } catch (error) {

                    return {

                        success: true,

                        type: "partial",

                        translations:
                            collected,

                        source:
                            "dictionary",

                        needsExternalTranslation:
                            true

                    };

                }

            }

        }


        /* ---------------------------------------------
           3. NOTHING IN DICTIONARY
        --------------------------------------------- */

        try {

            const external =
                await this.googleTranslate(
                    text,
                    source,
                    target
                );


            return {

                success: true,

                type: "external",

                translations: [
                    external
                ],

                source: "external",

                needsExternalTranslation: false

            };

        } catch (error) {

            console.error(
                "SOVT External Translation Error:",
                error
            );


            return {

                success: false,

                type: "external_error",

                translations: [],

                error:
                    error.message,

                needsExternalTranslation:
                    true

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
   GLOBAL SOVT ENGINE
========================================================= */

const translator =
    new TranslatorEngine(
        "./data/ITACHI_DICTIONARY.tsv"
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
                "SOVT failed to start:",
                error
            );

        }

    }
);
