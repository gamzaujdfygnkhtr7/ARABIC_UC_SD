/* =========================================================
   SOVT API
   Central API for SOVT
========================================================= */

const API_VERSION = "1.0.0";


/* =========================================================
   CORS
========================================================= */

function corsHeaders() {

    return {

        "Access-Control-Allow-Origin": "*",

        "Access-Control-Allow-Methods":
            "GET, POST, OPTIONS",

        "Access-Control-Allow-Headers":
            "Content-Type, Authorization",

        "Content-Type":
            "application/json; charset=UTF-8"

    };

}


/* =========================================================
   JSON RESPONSE
========================================================= */

function json(data, status = 200) {

    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: corsHeaders()
        }
    );

}


/* =========================================================
   OPTIONS
========================================================= */

function optionsResponse() {

    return new Response(
        null,
        {
            status: 204,
            headers: corsHeaders()
        }
    );

}


/* =========================================================
   NORMALIZE
========================================================= */

function normalize(text) {

    if (
        typeof text !== "string"
    ) {

        return "";

    }

    return text
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();

}


/* =========================================================
   GOOGLE TRANSLATE
========================================================= */

async function googleTranslate(
    text,
    source,
    target
) {

    const url =
        "https://translate.googleapis.com/" +
        "translate_a/single" +
        "?client=gtx" +
        "&sl=" +
        encodeURIComponent(source || "auto") +
        "&tl=" +
        encodeURIComponent(target || "en") +
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


/* =========================================================
   GET SAVED TRANSLATION
========================================================= */

async function getSavedTranslation(
    env,
    key
) {

    if (!env.SOVT_KV) {

        return null;

    }

    try {

        return await env.SOVT_KV.get(
            key
        );

    } catch (error) {

        console.error(
            "KV READ ERROR:",
            error
        );

        return null;

    }

}


/* =========================================================
   SAVE TRANSLATION
========================================================= */

async function saveTranslation(
    env,
    key,
    data
) {

    if (!env.SOVT_KV) {

        return false;

    }

    try {

        await env.SOVT_KV.put(
            key,
            JSON.stringify(data)
        );

        return true;

    } catch (error) {

        console.error(
            "KV WRITE ERROR:",
            error
        );

        return false;

    }

}


/* =========================================================
   TRANSLATE API
========================================================= */

async function handleTranslate(
    request,
    env
) {

    let body;


    try {

        body =
            await request.json();

    } catch {

        return json(
            {
                success: false,
                error: "Invalid JSON."
            },
            400
        );

    }


    const text =
        typeof body.text === "string"
            ? body.text.trim()
            : "";


    const source =
        body.source || "auto";


    const target =
        body.target || "en";


    if (!text) {

        return json(
            {
                success: false,
                error: "Text is required."
            },
            400
        );

    }


    /* -----------------------------------------
       Dictionary key
    ----------------------------------------- */

    const key =
        "translation:" +
        normalize(source) +
        ":" +
        normalize(target) +
        ":" +
        normalize(text);


    /* -----------------------------------------
       Search saved translation
    ----------------------------------------- */

    const saved =
        await getSavedTranslation(
            env,
            key
        );


    if (saved) {

        try {

            const data =
                JSON.parse(saved);

            return json({

                success: true,

                type: "dictionary",

                translation:
                    data.translation,

                source,

                target,

                cached: true,

                api: API_VERSION

            });

        } catch {

            /* Ignore invalid cached data */

        }

    }


    /* -----------------------------------------
       External translation
    ----------------------------------------- */

    try {

        const translation =
            await googleTranslate(
                text,
                source,
                target
            );


        const savedData = {

            text,

            translation,

            source,

            target,

            createdAt:
                new Date().toISOString()

        };


        const savedSuccessfully =
            await saveTranslation(
                env,
                key,
                savedData
            );


        return json({

            success: true,

            type: "external",

            translation,

            source,

            target,

            cached: savedSuccessfully,

            api: API_VERSION

        });

    } catch (error) {

        return json(
            {
                success: false,

                type: "translation_error",

                error:
                    error.message,

                api:
                    API_VERSION

            },
            502
        );

    }

}


/* =========================================================
   MANUAL SAVE API
========================================================= */

async function handleSave(
    request,
    env
) {

    let body;


    try {

        body =
            await request.json();

    } catch {

        return json(
            {
                success: false,
                error: "Invalid JSON."
            },
            400
        );

    }


    const text =
        typeof body.text === "string"
            ? body.text.trim()
            : "";


    const translation =
        typeof body.translation === "string"
            ? body.translation.trim()
            : "";


    const source =
        body.source || "auto";


    const target =
        body.target || "en";


    if (
        !text ||
        !translation
    ) {

        return json(
            {
                success: false,
                error:
                    "text and translation are required."
            },
            400
        );

    }


    const key =
        "translation:" +
        normalize(source) +
        ":" +
        normalize(target) +
        ":" +
        normalize(text);


    const saved =
        await saveTranslation(
            env,
            key,
            {

                text,

                translation,

                source,

                target,

                createdAt:
                    new Date().toISOString(),

                manuallySaved:
                    true

            }
        );


    return json({

        success: saved,

        type: "save",

        saved,

        api: API_VERSION

    });

}


/* =========================================================
   HEALTH
========================================================= */

function handleHealth() {

    return json({

        success: true,

        name: "SOVT API",

        version:
            API_VERSION,

        status: "online",

        timestamp:
            new Date().toISOString()

    });

}


/* =========================================================
   API ROUTER
========================================================= */

async function router(
    request,
    env
) {

    const url =
        new URL(request.url);


    const path =
        url.pathname;


    if (
        request.method === "GET" &&
        path === "/api/health"
    ) {

        return handleHealth();

    }


    if (
        request.method === "POST" &&
        path === "/api/translate"
    ) {

        return handleTranslate(
            request,
            env
        );

    }


    if (
        request.method === "POST" &&
        path === "/api/save"
    ) {

        return handleSave(
            request,
            env
        );

    }


    if (
        request.method === "GET" &&
        (
            path === "/" ||
            path === "/api"
        )
    ) {

        return json({

            success: true,

            name: "SOVT API",

            version:
                API_VERSION,

            endpoints: {

                health:
                    "/api/health",

                translate:
                    "/api/translate",

                save:
                    "/api/save"

            }

        });

    }


    return json(
        {
            success: false,
            error: "API endpoint not found."
        },
        404
    );

}


/* =========================================================
   WORKER
========================================================= */

export default {

    async fetch(
        request,
        env
    ) {

        if (
            request.method === "OPTIONS"
        ) {

            return optionsResponse();

        }


        try {

            return await router(
                request,
                env
            );

        } catch (error) {

            console.error(
                "SOVT API ERROR:",
                error
            );

            return json(
                {
                    success: false,
                    error:
                        "Internal server error."
                },
                500
            );

        }

    }

};
