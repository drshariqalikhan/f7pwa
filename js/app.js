const app = new Framework7();

const authType =
document.getElementById("authType");

authType.addEventListener(
    "change",
    updateAuthFields
);

updateAuthFields();

document
.getElementById("addHeaderBtn")
.addEventListener(
    "click",
    addHeaderRow
);

document
.getElementById("sendBtn")
.addEventListener(
    "click",
    sendRequest
);

function updateAuthFields(){

    const type = authType.value;

    document
    .getElementById("tokenGroup")
    .style.display =
        (
            type === "bearer" ||
            type === "apikey"
        )
        ? "block"
        : "none";

    document
    .getElementById("basicGroup")
    .style.display =
        (
            type === "basic"
        )
        ? "block"
        : "none";
}

function addHeaderRow(){

    const row =
    document.createElement("div");

    row.className =
    "header-row";

    row.innerHTML = `

        <div class="header-grid">

            <select class="header-name">

                <option value="Content-Type">
                    Content-Type
                </option>

                <option value="Accept">
                    Accept
                </option>

                <option value="Authorization">
                    Authorization
                </option>

                <option value="X-API-Key">
                    X-API-Key
                </option>

                <option value="Cache-Control">
                    Cache-Control
                </option>

            </select>

            <input
                type="text"
                class="header-value"
                placeholder="Value">

            <button
                class="remove-header button button-fill color-red">
                ✕
            </button>

        </div>

    `;

    document
    .getElementById("headerContainer")
    .appendChild(row);

    row
    .querySelector(".remove-header")
    .addEventListener("click", () => {
        row.remove();
    });
}

document
.querySelectorAll(".remove-header")
.forEach(btn => {

    btn.addEventListener("click", e => {

        e.target
         .closest(".header-row")
         .remove();
    });

});

function buildHeaders(){

    const headers = {};

    document
    .querySelectorAll(".header-row")
    .forEach(row => {

        const name =
            row.querySelector(".header-name").value;

        const value =
            row.querySelector(".header-value").value;

        if(value.trim()){

            headers[name] = value;
        }

    });

    return headers;
}

function applyAuth(headers){

    const type =
    document
    .getElementById("authType")
    .value;

    if(type === "bearer"){

        headers.Authorization =
        "Bearer " +
        document
        .getElementById("authValue")
        .value;
    }

    if(type === "apikey"){

        headers["X-API-Key"] =
        document
        .getElementById("authValue")
        .value;
    }

    if(type === "basic"){

        headers.Authorization =
        "Basic " +
        btoa(
            document.getElementById("username").value +
            ":" +
            document.getElementById("password").value
        );
    }
}

async function sendRequest(){

    const url =
    document
    .getElementById("url")
    .value
    .trim();

    if(!url){

        app.dialog.alert(
            "Enter a URL"
        );

        return;
    }

    const method =
    document
    .getElementById("method")
    .value;

    const headers =
    buildHeaders();

    applyAuth(headers);

    const options = {
        method,
        headers
    };

    if(
       method !== "GET" &&
       method !== "DELETE"
    ){

        options.body =
        document
        .getElementById("body")
        .value;
    }

    const responseBox =
    document
    .getElementById("response");

    const metaBox =
    document
    .getElementById("meta");

    responseBox.textContent =
    "Sending...";

    const start =
    performance.now();

    try{

        const response =
        await fetch(
            url,
            options
        );

        const elapsed =
        Math.round(
            performance.now() - start
        );

        const text =
        await response.text();

        let formatted =
        text;

        try{

            formatted =
            JSON.stringify(
                JSON.parse(text),
                null,
                2
            );

        }catch{}

        metaBox.innerHTML = `
            <div class="status-box">
                Status: <b>${response.status}</b>
                <br>
                Time: <b>${elapsed}ms</b>
                <br>
                Size: <b>${text.length}</b> bytes
            </div>
        `;

        responseBox.textContent =
        formatted;

    }
    catch(error){

        responseBox.textContent =
        error.message;
    }
}

if("serviceWorker" in navigator){

    window.addEventListener(
        "load",
        () => {

            navigator
            .serviceWorker
            .register("./sw.js");

        }
    );
}