/* =========================================================
   SOVT TRANSLATOR ENGINE V1
   Dictionary + SOVT Model
   ========================================================= */

class TranslatorEngine {

    constructor(
        dictionaryUrl = "./data/ITACHI_DICTIONARY.tsv"
    ) {

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

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = (async () => {

            try {

                console.log(
                    "SOVT: Loading dictionary:",
                    this.dictionaryUrl
                );

                const response = await fetch(
                    this.dictionaryUrl,
                    {
                        cache: "no-cache"
                    }
                );

                if (!response.ok) {

                    throw new Error(
                        "HTTP " +
                        response.status +
                        " - تعذر تحميل ملف الترجمة"
                    );
                }

                const text =
                    await response.text();

                if (!text.trim()) {

                    throw new Error(
                        "ملف القاموس فارغ"
                    );
                }

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

                this.loaded = false;

                throw error;

            } finally {

                this.loadingPromise = null;
            }

        })();

        return this.loadingPromise;
    }


    /* =====================================================
       NORMALIZE
       ===================================================== */

    normalize(text) {

        if (
            typeof text !== "string"
        ) {
            return "";
        }

        return text
            .replace(/^\uFEFF/, "")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();
    }


    /* =====================================================
       PARSE TSV
       ===================================================== */

    parseTSV(text) {

        const lines =
            text.split(/\r?\n/);

        let validEntries = 0;

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
                line
                    .slice(0, separator)
                    .trim();

            const target =
                line
                    .slice(separator + 1)
                    .trim();

            if (
                !source ||
                !target
            ) {
                continue;
            }

            const key =
                this.normalize(source);

            if (
                !this.dictionary.has(key)
            ) {

                this.dictionary.set(
                    key,
                    new Set()
                );
            }

            this.dictionary
                .get(key)
                .add(target);

            validEntries++;
        }

        console.log(
            "SOVT TSV parsed:",
            validEntries,
            "valid rows"
        );
    }


    /* =====================================================
       EXACT SEARCH
       ===================================================== */

    findExact(text) {

        const key =
            this.normalize(text);

        if (!key) {
            return [];
        }

        const results =
            this.dictionary.get(key);

        if (!results) {
            return [];
        }

        return Array.from(results);
    }


    /* =====================================================
       SOVT MODEL SEARCH
       ===================================================== */

    findWithModel(text) {

        if (
            !window.sovtModel ||
            typeof window.sovtModel.createVariants !==
                "function"
        ) {

            return null;
        }

        const variants =
            window.sovtModel.createVariants(
                text
            );

        for (const variant of variants) {

            const results =
                this.findExact(variant);

            if (results.length > 0) {

                return {

                    variant:
                        variant,

                    translations:
                        results
                };
            }
        }

        return null;
    }


    /* =====================================================
       WORD / PHRASE SEARCH
       ===================================================== */

    findParts(text) {

        const normalized =
            this.normalize(text);

        if (!normalized) {
            return [];
        }

        const words =
            normalized.split(" ");

        const matches = [];


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

                const phrase =
                    words
                        .slice(
                            start,
                            start + length
                        )
                        .join(" ");

                const results =
                    this.dictionary.get(
                        phrase
                    );

                if (results) {

                    matches.push({

                        phrase:
                            phrase,

                        translations:
                            Array.from(results),

                        start:
                            start,

                        length:
                            length
                    });
                }
            }
        }

        return matches;
    }


    /* =====================================================
       TRANSLATE
       ===================================================== */

    async translate(
        text,
        options = {}
    ) {

        if (
            typeof text !== "string" ||
            !text.trim()
        ) {

            return {

                success:
                    false,

                type:
                    "empty",

                source:
                    text,

                translations:
                    []
            };
        }


        /* تحميل القاموس */

        try {

            await this.load();

        } catch (error) {

            return {

                success:
                    false,

                type:
                    "dictionary_error",

                source:
                    text,

                translations:
                    [],

                error:
                    error.message
            };
        }


        /* =================================================
           1. EXACT MATCH
           ================================================= */

        const exact =
            this.findExact(text);

        if (
            exact.length > 0
        ) {

            return {

                success:
                    true,

                type:
                    "exact",

                source:
                    text,

                translations:
                    exact,

                needsExternalTranslation:
                    false
            };
        }


        /* =================================================
           2. SOVT MODEL
           
           مثال:
           لاااااا
           ↓
           لا
           ↓
           قاموس
           ↓
           No
           ================================================= */

        const modelResult =
            this.findWithModel(text);

        if (modelResult) {

            return {

                success:
                    true,

                type:
                    "model",

                source:
                    text,

                normalized:
                    modelResult.variant,

                translations:
                    modelResult.translations,

                needsExternalTranslation:
                    false
            };
        }


        /* =================================================
           3. PARTIAL MATCH
           ================================================= */

        const parts =
            this.findParts(text);

        if (
            parts.length > 0
        ) {

            return {

                success:
                    true,

                type:
                    "partial",

                source:
                    text,

                translations:
                    parts,

                needsExternalTranslation:
                    true
            };
        }


        /* =================================================
           4. UNKNOWN
           ================================================= */

        return {

            success:
                false,

            type:
                "unknown",

            source:
                text,

            translations:
                [],

            needsExternalTranslation:
                true
        };
    }


    /* =====================================================
       GET DICTIONARY SIZE
       ===================================================== */

    getSize() {

        return this.dictionary.size;
    }


    /* =====================================================
       CHECK WORD
       ===================================================== */

    has(text) {

        const key =
            this.normalize(text);

        return this.dictionary.has(
            key
        );
    }


    /* =====================================================
       CLEAR
       ===================================================== */

    clear() {

        this.dictionary.clear();

        this.loaded = false;

        this.loadingPromise = null;
    }
}


/* =========================================================
   CREATE TRANSLATOR
   ========================================================= */

const translator =
    new TranslatorEngine(
        "./data/ITACHI_DICTIONARY.tsv"
    );


/* =========================================================
   GLOBAL ACCESS
   ========================================================= */

window.TranslatorEngine =
    TranslatorEngine;

window.translator =
    translator;


/* =========================================================
   AUTO LOAD
   ========================================================= */

window.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            await translator.load();

            console.log(
                "SOVT Translator ready."
            );

            console.log(
                "Dictionary size:",
                translator.getSize()
            );


            /* اختبارات */

            console.log(
                'SOVT Test "Hello":',
                translator.findExact(
                    "Hello"
                )
            );

            console.log(
                'SOVT Test "أهلا":',
                translator.findExact(
                    "أهلا"
                )
            );

            console.log(
                'SOVT Model Test "لاااا":',
                window.sovtModel
                    ? window.sovtModel.process(
                        "لاااا"
                    )
                    : "Model not loaded"
            );

        } catch (error) {

            console.error(
                "SOVT Translator failed to load:",
                error
            );
        }
    }
);
