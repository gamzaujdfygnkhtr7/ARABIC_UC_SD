/* =========================================================
   SOVT TRANSLATOR ENGINE V1.2
   Dictionary + Smart Arabic Normalization
   + Google Translate Fallback
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

                const response =
                    await fetch(
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

                this.loaded = false;

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

        if (
            typeof text !== "string"
        ) {
            return "";
        }

        let value = text;

        value =
            value.replace(
                /^\uFEFF/,
                ""
            );

        value =
            value.trim();

        value =
            value.replace(
                /\s+/g,
                " "
            );

        value =
            value
                .replace(
                    /[إأآٱ]/g,
                    "ا"
                )
                .replace(
                    /ى/g,
                    "ي"
                )
                .replace(
                    /ؤ/g,
                    "و"
                )
                .replace(
                    /ئ/g,
                    "ي"
                );

        value =
            value.replace(
                /[\u064B-\u065F\u0670]/g,
                ""
            );

        value =
            value.replace(
                /ـ+/g,
                ""
            );

        value =
            value.replace(
                /([\u0600-\u06FF])\1{2,}/g,
                "$1"
            );

        return value.toLowerCase();
    }


    /* =====================================================
       PARSE TSV
       ===================================================== */

    parseTSV(text) {

        this.dictionary.clear();

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
                    .slice(
                        0,
                        separator
                    )
                    .trim();

            const target =
                line
                    .slice(
                        separator + 1
                    )
                    .trim();

            if (
                !source ||
                !target
            ) {
                continue;
            }

            const key =
                this.normalize(
                    source
                );

            if (!key) {
                continue;
            }

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

        return Array.from(
            results
        );
    }


    /* =====================================================
       SMART SEARCH
       ===================================================== */

    findSmart(text) {

        const original =
            this.normalize(text);

        if (!original) {
            return [];
        }

        let results =
            this.dictionary.get(
                original
            );

        if (results) {

            return Array.from(
                results
            );
        }

        let simplified =
            original.replace(
                /([\u0600-\u06FF])\1+/g,
                "$1"
            );

        results =
            this.dictionary.get(
                simplified
            );

        if (results) {

            return Array.from(
                results
            );
        }

        return [];
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
                    this.findSmart(
                        phrase
                    );

                if (
                    results.length > 0
                ) {

                    matches.push({

                        phrase:
                            phrase,

                        translations:
                            results,

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
       GOOGLE TRANSLATE
       ===================================================== */

    async googleTranslate(
        text,
        source = "auto",
        target = "en"
    ) {

        if (
            !text ||
            !target
        ) {

            throw new Error(
                "نص أو لغة غير صحيحة"
            );
        }

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
            await fetch(
                url
            );

        if (!response.ok) {

            throw new Error(
                "Google Translate HTTP " +
                response.status
            );
        }

        const data =
            await response.json();

        if (
            !Array.isArray(data) ||
            !Array.isArray(data[0])
        ) {

            throw new Error(
                "استجابة Google Translate غير صالحة"
            );
        }

        const translated =
            data[0]
                .map(function (part) {

                    if (
                        Array.isArray(part)
                    ) {
                        return part[0] || "";
                    }

                    return "";
                })
                .join("")
                .trim();

        if (!translated) {

            throw new Error(
                "Google لم يرجع ترجمة"
            );
        }

        return translated;
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

                success: false,

                type: "empty",

                source: text,

                translations: []
            };
        }


        const source =
            options.source || "auto";

        const target =
            options.target || "en";


        /* ================================================
           تحميل القاموس
           ================================================ */

        try {

            await this.load();

        } catch (error) {

            return {

                success: false,

                type: "dictionary_error",

                source: text,

                translations: [],

                needsExternalTranslation: true,

                error:
                    error.message
            };
        }


        /* ================================================
           1. البحث الكامل
           ================================================ */

        const exact =
            this.findSmart(text);

        if (
            exact.length > 0
        ) {

            return {

                success: true,

                type: "exact",

                source: text,

                translations: exact,

                needsExternalTranslation: false,

                fromDictionary: true
            };
        }


        /* ================================================
           2. البحث عن أجزاء
           ================================================ */

        const parts =
            this.findParts(text);

        if (
            parts.length > 0
        ) {

            /*
             * لدينا أجزاء معروفة،
             * لكن نستخدم Google للنص كاملًا
             * حتى لا نخرج ترجمة مقطعة.
             */

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

                    source: text,

                    translations: [
                        external
                    ],

                    parts: parts,

                    needsExternalTranslation: false,

                    fromDictionary: false,

                    fromGoogle: true
                };

            } catch (error) {

                return {

                    success: true,

                    type: "partial",

                    source: text,

                    translations: parts,

                    needsExternalTranslation: true,

                    fromDictionary: true,

                    fromGoogle: false,

                    externalError:
                        error.message
                };
            }
        }


        /* ================================================
           3. غير موجود → Google
           ================================================ */

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

                source: text,

                translations: [
                    external
                ],

                needsExternalTranslation: false,

                fromDictionary: false,

                fromGoogle: true
            };

        } catch (error) {

            console.error(
                "SOVT Google Translate Error:",
                error
            );

            return {

                success: false,

                type: "external_error",

                source: text,

                translations: [],

                needsExternalTranslation: true,

                fromGoogle: false,

                error:
                    error.message
            };
        }
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

        return (
            this.findSmart(text).length > 0
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
   CREATE SOVT TRANSLATOR
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
                "SOVT Translator V1.2 ready."
            );

            console.log(
                "Dictionary size:",
                translator.getSize()
            );

            console.log(
                'SOVT Test "Hello":',
                translator.findSmart(
                    "Hello"
                )
            );

            console.log(
                'SOVT Test "هلا":',
                translator.findSmart(
                    "هلا"
                )
            );

        } catch (error) {

            console.error(
                "SOVT Translator failed to load:",
                error
            );
        }
    }
);
