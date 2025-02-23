
const apiKeys = "KeLVOKnelfNy0lwDEDQy4jbXX_FpUo47SyDGIJVOiW1D"
async function getIbmToken() {
    const url = "https://iam.cloud.ibm.com/identity/token";
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    const apiKey = apiKeys;

    if (!apiKey) {
        throw new Error("IBM API Key not found. Set it as an environment variable.");
    }

    const data = new URLSearchParams({
        'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
        'apikey': apiKey
    });

    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: data
        });
        const result = await response.json();
        return result.access_token;
    } catch (error) {
        console.error("Error fetching IBM token:", error);
        throw error;
    }
}
const token = await getIbmToken();

async function graniteQuery(prompt) {
    const token = await getIbmToken();
    const url = "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29";
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`

    };
    const systemPrompt = "You are a language learning assistant. If the user speaks in French, respond in French and provide corrections.If the user speaks in English, first respond in English, then provide the French translation. Be friendly and helpful."
    const payload = {
        "input": `<|start_of_role|>system<|end_of_role|>${systemPrompt}<|end_of_text|>\n`
            + `<|start_of_role|>user<|end_of_role|>${prompt}<|end_of_text|>\n`
            + `<|start_of_role|>assistant<|end_of_role|>`,
        "parameters": { "max_new_tokens": 300 },
        "model_id": "ibm/granite-13b-instruct-v2",
        "project_id": "44e4e31f-bde1-4da6-85ec-7dfbb505cffa"
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        // console.log(result);

        return result.results[0].generated_text;
    } catch (error) {
        console.error("Error fetching Granite query:", error);
        throw error;
    }
}

// export const generateText = async (input) => {
//     const url = "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29";
//     const headers = {
//         "Accept": "application/json",
//         "Content-Type": "application/json",
//         'Authorization': `Bearer ${token}`
//     };

//     const body = {
//         input: `<|start_of_role|>user<|end_of_role|>${input}<|end_of_text|>\n<|start_of_role|>assistant<|end_of_role|>`,
//         parameters: { decoding_method: "greedy", max_new_tokens: 200, repetition_penalty: 1.05 },
//         model_id: "ibm/granite-13b-instruct-v2",
//         project_id: "44e4e31f-bde1-4da6-85ec-7dfbb505cffa"
//     };

//     try {
//         const response = await fetch(url, {
//             method: "POST",
//             headers,
//             body: JSON.stringify(body)
//         });

//         if (!response.ok) throw new Error("Erreur API");

//         const data = await response.json();
//         return data.results[0].generated_text;
//     } catch (error) {
//         console.error("Erreur :", error);
//         return null;
//     }
// };


// Exemple d'utilisation
graniteQuery("How can I plan my oncomming holidays")
    .then(response => console.log(response))
    .catch(error => console.error("Error:", error));

// const response = await generateText("Présente-toi");
// console.log("response" , response);