/* =========================================================
   SOVT TRANSLATOR ENGINE
   Dictionary-based translation
   AR <-> EN
   ========================================================= */

class TranslatorEngine {

    constructor(dictionaryUrl = "./data/ITACHI_DICTIONARY.tsv") {

        this.dictionaryUrl = dictionaryUrl;

        // ar -> en
        this.arToEn = new Map();

        // en -> ar
        this.enToAr = new Map();

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
                        " - تعذر تحميل ملف القاموس"
                    );
                }

                const text = await response.text();

                if (!text.trim()) {

                    throw new Error(
                        "ملف القاموس فارغ"
                    );
                }

                this.parseTSV(text);

                this.loaded = true;

                console.log(
                    "SOVT dictionary loaded."
                );

                console.log(
                    "AR -> EN:",
                    this.arToEn.size
                );

                console.log(
                    "EN -> AR:",
                    this.enToAr.size
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
       NORMALIZE
       ===================================================== */

    normalize(text) {

        if (typeof text !== "string") {
            return "";
        }

        return text
            .replace(/^\uFEFF/, "")
            .replace(/\r/g, "")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();
    }


    /* =====================================================
       ADD ENTRY
       ===================================================== */

    addEntry(map, source, target) {

        const key = this.normalize(source);

        if (!key || !target) {
            return;
        }

        if (!map.has(key)) {

            map.set(
                key,
                new Set()
            );
        }

        map
            .get(key)
            .add(target.trim());
    }


    /* =====================================================
       PARSE TSV
       
       القاموس عندك بهذا الشكل:

       أهلا        Hello
       Hello       أهلا

       لذلك نقرأ الاتجاهين تلقائيًا.
       ===================================================== */

    parseTSV(text) {

        this.arToEn.clear();
        this.enToAr.clear();

        const lines =
            text.split(/\r?\n/);

        let rows = 0;

        for (const line of lines) {

            if (!line.trim()) {
                continue;
            }

            const separator =
                line.indexOf("\t");

            if (separator === -1) {
                continue;
            }

            const col1 =
                line
                    .slice(0, separator)
                    .trim();

            const col2 =
                line
                    .slice(separator + 1)
                    .trim();

            if (!col1 || !col2) {
                continue;
            }

            /*
             * إذا كان العمود الأول عربي:
             *
             * عربي -> إنجليزي
             */

            if (this.isArabic(col1)) {

                this.addEntry(
                    this.arToEn,
                    col1,
                    col2
                );

                /*
                 * ونضيف الاتجاه العكسي أيضًا
                 */

                this.addEntry(
                    this.enToAr,
                    col2,
                    col1
                );

            }

            /*
             * إذا كان العمود الأول إنجليزي:
             *
             * إنجليزي -> عربي
             */

            else {

                this.addEntry(
                    this.enToAr,
                    col1,
                    col2
                );

                /*
                 * الاتجاه العكسي
                 */

                this.addEntry(
                    this.arToEn,
                    col2,
                    col1
                );
            }

            rows++;
        }

        console.log(
            "SOVT TSV parsed:",
            rows,
            "rows"
        );
    }


    /* =====================================================
       DETECT ARABIC
       ===================================================== */

    isArabic(text) {

        return /[\u0600-\u06FF]/.test(text);
    }


    /* =====================================================
       GET MAP
       ===================================================== */

    getMap(source, target) {

        if (
            source === "ar" &&
            target === "en"
        ) {

            return this.arToEn;
        }

        if (
            source === "en" &&
            target === "ar"
        ) {

            return this.enToAr;
        }

        return null;
    }


    /* =====================================================
       EXACT SEARCH
       ===================================================== */

    findExact(
        text,
        source = "ar",
        target = "en"
    ) {

        const map =
            this.getMap(
                source,
                target
            );

        if (!map) {
            return [];
        }

        const key =
            this.normalize(text);

        if (!key) {
            return [];
        }

        const results =
            map.get(key);

        if (!results) {
            return [];
        }

        return Array.from(results);
    }


    /* =====================================================
       PARTIAL TRANSLATION
       ===================================================== */

    translateParts(
        text,
        source,
        target
    ) {

        const map =
            this.getMap(
                source,
                target
            );

        if (!map) {
            return null;
        }

        const normalized =
            this.normalize(text);

        if (!normalized) {
            return null;
        }

        const words =
            normalized.split(" ");

        const output = [];

        let i = 0;

        while (i < words.length) {

            let found = false;

            /*
             * نبحث عن أطول عبارة أولًا.
             *
             * مثال:
             *
             * How are you
             *
             * بدل:
             * How
             * are
             * you
             */

            for (
                let length = words.length - i;
                length >= 1;
                length--
            ) {

                const phrase =
                    words
                        .slice(
                            i,
                            i + length
                        )
                        .join(" ");

                const result =
                    map.get(phrase);

                if (result) {

                    const translations =
                        Array.from(result);

                    output.push(
                        translations[0]
                    );

                    i += length;

                    found = true;

                    break;
                }
            }

            /*
             * الكلمة غير موجودة.
             *
             * نحافظ عليها بدل حذفها.
             */

            if (!found) {

                output.push(
                    words[i]
                );

                i++;
            }
        }

        /*
         * إذا لم نجد أي ترجمة فعلية
         */

        if (
            output.every(
                (word, index) =>
                    word === words[index]
            )
        ) {

            return null;
        }

        return output.join(" ");
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


        try {

            await this.load();

        } catch (error) {

            return {

                success: false,

                type: "dictionary_error",

                source: text,

                translations: [],

                error:
                    error.message
            };
        }


        /*
         * اللغة الافتراضية
         */

        const source =
            options.source || "ar";

        const target =
            options.target || "en";


        /*
         * نفس اللغة
         */

        if (source === target) {

            return {

                success: true,

                type: "same_language",

                source: text,

                translations: [text],

                translation: text
            };
        }


        /* =================================================
           EXACT MATCH
           ================================================= */

        const exact =
            this.findExact(
                text,
                source,
                target
            );

        if (exact.length > 0) {

            return {

                success: true,

                type: "exact",

                source: text,

                translations: exact,

                translation: exact[0],

                needsExternalTranslation: false
            };
        }


        /* =================================================
           PARTIAL MATCH
           ================================================= */

        const partial =
            this.translateParts(
                text,
                source,
                target
            );

        if (partial) {

            return {

                success: true,

                type: "partial",

                source: text,

                translations: [partial],

                translation: partial,

                needsExternalTranslation: false
            };
        }


        /* =================================================
           UNKNOWN
           ================================================= */

        return {

            success: false,

            type: "unknown",

            source: text,

            translations: [],

            translation: "",

            needsExternalTranslation: true,

            message:
                "لم نجد ترجمة لهذا النص في قاموس SOVT."
        };
    }


    /* =====================================================
       DICTIONARY SIZE
       ===================================================== */

    getSize() {

        return (
            this.arToEn.size +
            this.enToAr.size
        );
    }


    /* =====================================================
       CHECK WORD
       ===================================================== */

    has(
        text,
        source = "ar",
        target = "en"
    ) {

        const map =
            this.getMap(
                source,
                target
            );

        if (!map) {
            return false;
        }

        return map.has(
            this.normalize(text)
        );
    }


    /* =====================================================
       CLEAR
       ===================================================== */

    clear() {

        this.arToEn.clear();
        this.enToAr.clear();

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
   GLOBAL
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

            /*
             * اختبارات مباشرة في Console
             */

            console.log(
                'SOVT TEST AR -> EN:',
                translator.findExact(
                    "أهلا",
                    "ar",
                    "en"
                )
            );

            console.log(
                'SOVT TEST EN -> AR:',
                translator.findExact(
                    "Hello",
                    "en",
                    "ar"
                )
            );

            console.log(
                'SOVT TEST:',
                await translator.translate(
                    "صباح الخير",
                    {
                        source: "ar",
                        target: "en"
                    }
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
