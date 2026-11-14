const app = new Framework7();

document
  .getElementById("sendBtn")
  .addEventListener("click", sendRequest);

async function sendRequest(){

    const url =
        document.getElementById("url").value.trim();

    const method =
        document.getElementById("method").value;

    if(!url){
        app.dialog.alert("Enter a URL");
        return;
    }

    let headers = {};

    try{

        headers = JSON.parse(
            document.getElementById("headers").value
        );

    } catch {

        app.dialog.alert(
            "Invalid headers JSON"
        );

        return;
    }

    const authType =
        document.getElementById("authType").value;

    if(authType === "bearer"){

        headers.Authorization =
            "Bearer " +
            document.getElementById("token").value;
    }

    if(authType === "basic"){

        const user =
            document.getElementById("username").value;

        const pass =
            document.getElementById("password").value;

        headers.Authorization =
            "Basic " +
            btoa(user + ":" + pass);
    }

    const options = {
        method,
        headers
    };

    if(method !== "GET" &&
       method !== "DELETE"){

        options.body =
            document.getElementById("body").value;
    }

    const responseDiv =
        document.getElementById("response");

    const metaDiv =
        document.getElementById("meta");

    responseDiv.textContent =
        "Sending request...";

    const start =
        performance.now();

    try{

        const response =
            await fetch(url, options);

        const elapsed =
            Math.round(
                performance.now() - start
            );

        const text =
            await response.text();

        let pretty = text;

        try{

            pretty =
                JSON.stringify(
                    JSON.parse(text),
                    null,
                    2
                );

        } catch {}

        metaDiv.innerHTML = `
            <div class="status-box">
                Status:
                <b>${response.status}</b>

                <br>

                Time:
                <b>${elapsed} ms</b>

                <br>

                Size:
                <b>${text.length} bytes</b>
            </div>
        `;

        responseDiv.textContent =
            pretty;

    }
    catch(err){

        responseDiv.textContent =
            "ERROR\n\n" +
            err.message;
    }
}