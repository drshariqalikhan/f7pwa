const app = new Framework7();

/*
  Add Header Row
*/
document
    .getElementById("addHeaderBtn")
    .addEventListener("click", addHeaderRow);

/*
  Send Button
*/
document
    .getElementById("sendBtn")
    .addEventListener("click", sendRequest);

function addHeaderRow() {

    const row = document.createElement("div");

    row.className = "header-row";

    row.innerHTML = `
        <select class="header-name">
            <option value="Content-Type">Content-Type</option>
            <option value="Accept">Accept</option>
            <option value="Authorization">Authorization</option>
            <option value="X-API-Key">X-API-Key</option>
            <option value="User-Agent">User-Agent</option>
            <option value="Cache-Control">Cache-Control</option>
        </select>

        <input
            type="text"
            class="header-value"
            placeholder="Value">

        <button
            class="remove-header button button-small button-outline">
            X
        </button>
    `;

    document
        .getElementById("headerContainer")
        .appendChild(row);

    row.querySelector(".remove-header")
        .addEventListener("click", () => {
            row.remove();
        });
}

/*
  Build Headers
*/
function buildHeaders() {

    const headers = {};

    document
        .querySelectorAll(".header-row")
        .forEach(row => {

            const name =
                row.querySelector(".header-name").value;

            const value =
                row.querySelector(".header-value").value.trim();

            if (value) {
                headers[name] = value;
            }
        });

    return headers;
}

/*
  Apply Authentication
*/
function applyAuth(headers) {

    const authType =
        document.getElementById("authType").value;

    if (authType === "bearer") {

        const token =
            document.getElementById("authValue").value.trim();

        if (token) {
            headers.Authorization =
                "Bearer " + token;
        }

    }

    if (authType === "apikey") {

        const apiKey =
            document.getElementById("authValue").value.trim();

        if (apiKey) {
            headers["X-API-Key"] = apiKey;
        }

    }

    if (authType === "basic") {

        const username =
            document.getElementById("username").value;

        const password =
            document.getElementById("password").value;

        headers.Authorization =
            "Basic " +
            btoa(username + ":" + password);
    }
}

/*
  Send Request
*/
async function sendRequest() {

    const url =
        document.getElementById("url").value.trim();

    const method =
        document.getElementById("method").value;

    const responseBox =
        document.getElementById("response");

    const metaBox =
        document.getElementById("meta");

    if (!url) {

        app.dialog.alert("Please enter a URL.");

        return;
    }

    const headers =
        buildHeaders();

    applyAuth(headers);

    const options = {
        method,
        headers
    };

    if (
        method !== "GET" &&
        method !== "DELETE"
    ) {

        options.body =
            document.getElementById("body").value;
    }

    responseBox.textContent =
        "Sending request...";

    metaBox.innerHTML = "";

    const start =
        performance.now();

    try {

        const response =
            await fetch(url, options);

        const elapsed =
            Math.round(
                performance.now() - start
            );

        const text =
            await response.text();

        let formattedResponse =
            text;

        try {

            formattedResponse =
                JSON.stringify(
                    JSON.parse(text),
                    null,
                    2
                );

        } catch {
            // Not JSON
        }

        metaBox.innerHTML = `
            <div class="status-box">
                <b>Status:</b> ${response.status}
                <br>
                <b>Time:</b> ${elapsed} ms
                <br>
                <b>Size:</b> ${text.length} bytes
            </div>
        `;

        responseBox.textContent =
            formattedResponse;

    }
    catch (err) {

        metaBox.innerHTML = `
            <div class="status-box">
                Request Failed
            </div>
        `;

        responseBox.textContent =
            "ERROR\n\n" +
            err.message;
    }
}

/*
  Service Worker
*/
if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("./sw.js")
            .then(() => {
                console.log("SW Registered");
            })
            .catch(err => {
                console.error(err);
            });

    });
}