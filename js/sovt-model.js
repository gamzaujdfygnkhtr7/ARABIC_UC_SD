/* =========================================================
   SOVT MODEL V1.1
   Smart Text Normalization
   ========================================================= */

class SOVTModel {

    constructor() {

        /*
         * الحد الأقصى الطبيعي لتكرار الحرف.
         *
         * مثال:
         * هلاااااا
         * ↓
         * هلاا
         * ↓
         * هلا
         */

        this.maxRepeatedLetters = 2;
    }


    /* =====================================================
       BASIC NORMALIZATION
       ===================================================== */

    normalize(text) {

        if (typeof text !== "string") {
            return "";
        }

        return text
            .replace(/^\uFEFF/, "")
            .trim()
            .replace(/\s+/g, " ");
    }


    /* =====================================================
       REMOVE ARABIC TATWEEL
       
       الســــلام
       ↓
       السلام
       ===================================================== */

    removeTatweel(text) {

        if (!text) {
            return "";
        }

        return text.replace(/ـ+/g, "");
    }


    /* =====================================================
       REDUCE REPEATED LETTERS
       
       هلاااااا
       ↓
       هلاا
       
       لاااااا
       ↓
       لاا
       ===================================================== */

    reduceRepeatedLetters(text) {

        if (!text) {
            return "";
        }

        return text.replace(
            /(.)\1{2,}/gu,
            "$1$1"
        );
    }


    /* =====================================================
       CREATE REPETITION VARIANTS
       
       هذه أهم إضافة في V1.1.
       
       مثال:
       
       هلاااااا
       
       ↓
       هلاااااا
       ↓
       هلااا
       ↓
       هلاا
       ↓
       هلا
       
       ===================================================== */

    createRepetitionVariants(text) {

        const variants =
            new Set();

        if (!text) {
            return [];
        }

        variants.add(text);


        /*
         * نبحث عن أي حرف مكرر 3 مرات
         * أو أكثر ونقلله تدريجيًا.
         */

        let current = text;

        let safety = 0;

        while (
            safety < 20
        ) {

            safety++;

            const next =
                current.replace(
                    /(.)\1{2,}/gu,
                    "$1$1"
                );

            if (
                next === current
            ) {
                break;
            }

            current = next;

            variants.add(
                current
            );
        }


        /*
         * الآن ننتقل من حرفين متكررين
         * إلى حرف واحد.
         *
         * مثال:
         *
         * هلاا
         * ↓
         * هلا
         */

        current =
            current.replace(
                /(.)\1{1}/gu,
                "$1"
            );

        variants.add(
            current
        );


        return Array.from(
            variants
        );
    }


    /* =====================================================
       REDUCE PUNCTUATION
       
       !!!!! → !!
       ????? → ??
       ===================================================== */

    reducePunctuation(text) {

        if (!text) {
            return "";
        }

        return text
            .replace(/!{3,}/g, "!!")
            .replace(/؟{3,}/g, "؟؟")
            .replace(/\?{3,}/g, "??")
            .replace(/\.{4,}/g, "...");
    }


    /* =====================================================
       CREATE ALL VARIANTS
       ===================================================== */

    createVariants(text) {

        const original =
            this.normalize(text);

        if (!original) {
            return [];
        }

        const variants =
            new Set();


        /* ================================================
           1. النص الأصلي
           ================================================ */

        variants.add(
            original
        );


        /* ================================================
           2. إزالة التطويل
           ================================================ */

        const noTatweel =
            this.removeTatweel(
                original
            );

        variants.add(
            noTatweel
        );


        /* ================================================
           3. إنشاء احتمالات التكرار
           ================================================ */

        const repetitionVariants =
            this.createRepetitionVariants(
                noTatweel
            );

        for (
            const variant
            of repetitionVariants
        ) {

            variants.add(
                variant
            );
        }


        /* ================================================
           4. تنظيف علامات الترقيم
           ================================================ */

        const currentVariants =
            Array.from(
                variants
            );

        for (
            const variant
            of currentVariants
        ) {

            const cleaned =
                this.reducePunctuation(
                    variant
                );

            variants.add(
                cleaned
            );
        }


        /*
         * إزالة القيم الفارغة.
         */

        return Array.from(
            variants
        ).filter(
            Boolean
        );
    }


    /* =====================================================
       PROCESS
       ===================================================== */

    process(text) {

        const variants =
            this.createVariants(
                text
            );

        return {

            original:
                text,

            normalized:
                variants.length > 0
                    ? variants[
                        variants.length - 1
                    ]
                    : "",

            variants:
                variants,

            changed:
                variants.length > 1
        };
    }
}


/* =========================================================
   CREATE SOVT MODEL
   ========================================================= */

const sovtModel =
    new SOVTModel();


/* =========================================================
   GLOBAL ACCESS
   ========================================================= */

window.SOVTModel =
    SOVTModel;

window.sovtModel =
    sovtModel;


/* =========================================================
   READY
   ========================================================= */

console.log(
    "SOVT Model V1.1 loaded."
);


/* =========================================================
   TESTS
   ========================================================= */

console.log(
    'SOVT Test: "هلاااااا"',
    sovtModel.createVariants(
        "هلاااااا"
    )
);

console.log(
    'SOVT Test: "لاااااا"',
    sovtModel.createVariants(
        "لاااااا"
    )
);

console.log(
    'SOVT Test: "الســــلام"',
    sovtModel.createVariants(
        "الســــلام"
    )
);