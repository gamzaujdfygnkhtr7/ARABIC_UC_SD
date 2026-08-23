/* =========================================================
   ARABIC_UCH_SD TRANSLATOR ENGINE
   Dictionary-based translation engine
   ========================================================= */

class TranslatorEngine {

    constructor(dictionaryUrl) {

        this.dictionaryUrl = dictionaryUrl;

        this.dictionary = new Map();

        this.loaded = false;

    }


    /* =====================================================
       LOAD TSV
    ===================================================== */

    async load() {

        if (this.loaded) {
            return;
        }

        const response =
            await fetch(this.dictionaryUrl, {
                cache: "no-cache"
            });

        if (!response.ok) {

            throw new Error(
                "تعذر تحميل ملف الترجمة."
            );

        }

        const text =
            await response.text();

        this.parseTSV(text);

        this.loaded = true;

        console.log(
            "Translator dictionary loaded:",
            this.dictionary.size
        );

    }


    /* =====================================================
       NORMALIZE TEXT
    ===================================================== */

    normalize(text) {

        return text
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
       WORD / PHRASE SEARCH
    ===================================================== */

    findParts(text) {

        const normalized =
            this.normalize(text);

        const words =
            normalized.split(" ");

        const matches = [];


        /*
           نبحث عن أكبر أجزاء ممكنة أولًا.
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

                        phrase,

                        translations:
                            Array.from(results),

                        start,

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

    async translate(text) {

        await this.load();


        if (
            typeof text !== "string" ||
            !text.trim()
        ) {

            return {

                success: false,

                type: "empty",

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

                translations: exact

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

}


/* =========================================================
   CREATE ENGINE
   ========================================================= */

const translator =
    new TranslatorEngine(
        ""/data/ITACHI_DICTIONARY.tsv""
    );


/* =========================================================
   GLOBAL ACCESS
   ========================================================= */

window.TranslatorEngine =
    TranslatorEngine;

window.translator =
    translator;