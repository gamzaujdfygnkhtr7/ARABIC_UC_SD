/* =========================================================
   SOVT TRANSLATOR ENGINE
   Dictionary-based translation engine
   ========================================================= */

class TranslatorEngine {

    constructor(dictionaryUrl = "./data/ITACHI_DICTIONARY.tsv") {
        this.dictionaryUrl = dictionaryUrl;
        this.dictionary = new Map();
        this.loaded = false;
        this.loadingPromise = null;
    }

    /* =====================================================
       LOAD DICTIONARY
       ===================================================== */

    async load() {

        if (this.loaded) {
            return;
        }

        // Prevent multiple simultaneous downloads
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = (async () => {

            try {

                const response = await fetch(this.dictionaryUrl, {
                    cache: "no-cache"
                });

                if (!response.ok) {
                    throw new Error(
                        `تعذر تحميل ملف الترجمة (${response.status})`
                    );
                }

                const text = await response.text();

                this.parseTSV(text);

                this.loaded = true;

                console.log(
                    "SOVT dictionary loaded:",
                    this.dictionary.size,
                    "entries"
                );

            } catch (error) {

                console.error(
                    "SOVT Translator Error:",
                    error
                );

                throw error;

            } finally {

                this.loadingPromise = null;

            }

        })();

        return this.loadingPromise;
    }


    /* =====================================================
       NORMALIZE TEXT
       ===================================================== */

    normalize(text) {

        if (typeof text !== "string") {
            return "";
        }

        return text
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();
    }


    /* =====================================================
       PARSE TSV
       ===================================================== */

    parseTSV(text) {

        const lines = text.split(/\r?\n/);

        for (const line of lines) {

            if (!line.trim()) {
                continue;
            }

            const separator = line.indexOf("\t");

            if (separator === -1) {
                continue;
            }

            const source = line
                .slice(0, separator)
                .trim();

            const target = line
                .slice(separator + 1)
                .trim();

            if (!source || !target) {
                continue;
            }

            const key = this.normalize(source);

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

        const key = this.normalize(text);

        if (!key) {
            return [];
        }

        const results = this.dictionary.get(key);

        if (!results) {
            return [];
        }

        return Array.from(results);
    }


    /* =====================================================
       WORD / PHRASE SEARCH
       ===================================================== */

    findParts(text) {

        const normalized = this.normalize(text);

        if (!normalized) {
            return [];
        }

        const words = normalized.split(" ");

        const matches = [];

        /*
         * Search for the longest phrases first.
         */

        for (
            let length = words.length;
            length >= 1;
            length--
        ) {

            for (
                let start = 0;
                start + length <= words.length;
                start++
            ) {

                const phrase = words
                    .slice(start, start + length)
                    .join(" ");

                const results =
                    this.dictionary.get(phrase);

                if (results) {

                    matches.push({

                        phrase: phrase,

                        translations:
                            Array.from(results),

                        start: start,

                        length: length

                    });
                }
            }
        }

        return matches;
    }


    /* =====================================================
       TRANSLATE
       ===================================================== */

    async translate(text, options = {}) {

        try {

            await this.load();

        } catch (error) {

            return {

                success: false,

                type: "dictionary_error",

                source: text,

                translations: [],

                error: error.message

            };
        }


        if (
            typeof text !== "string" ||
            !text.trim()
        ) {

            return {

                success: false,

                type: "empty",

                source: text,

                translations: []

            };
        }


        /* =============================================
           1. EXACT MATCH
           ============================================= */

        const exact =
            this.findExact(text);

        if (exact.length > 0) {

            return {

                success: true,

                type: "exact",

                source: text,

                translations: exact,

                needsExternalTranslation: false

            };
        }


        /* =============================================
           2. PARTIAL MATCH
           ============================================= */

        const parts =
            this.findParts(text);

        if (parts.length > 0) {

            return {

                success: true,

                type: "partial",

                source: text,

                translations: parts,

                needsExternalTranslation: true

            };
        }


        /* =============================================
           3. UNKNOWN
           ============================================= */

        return {

            success: false,

            type: "unknown",

            source: text,

            translations: [],

            needsExternalTranslation: true

        };

    }


    /* =====================================================
       GET DICTIONARY SIZE
       ===================================================== */

    getSize() {

        return this.dictionary.size;

    }


    /* =====================================================
       CHECK IF WORD EXISTS
       ===================================================== */

    has(text) {

        const key = this.normalize(text);

        return this.dictionary.has(key);

    }


    /* =====================================================
       CLEAR DICTIONARY
       ===================================================== */

    clear() {

        this.dictionary.clear();

        this.loaded = false;

    }

}


/* =========================================================
   CREATE SOVT TRANSLATOR
   ========================================================= */

const translator = new TranslatorEngine(
    "./data/ITACHI_DICTIONARY.tsv"
);


/* =========================================================
   GLOBAL ACCESS
   ========================================================= */

window.TranslatorEngine = TranslatorEngine;

window.translator = translator;


/* =========================================================
   OPTIONAL AUTO LOAD
   ========================================================= */

window.addEventListener("DOMContentLoaded", async () => {

    try {

        await translator.load();

        console.log(
            "SOVT Translator ready."
        );

    } catch (error) {

        console.error(
            "SOVT Translator failed to load:",
            error
        );

    }

});
