const API_KEY =
  "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";

// Initialize Speech Recognition
const recognition = new (window.SpeechRecognition ||
  window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = "en-US";

// UI Elements
const micButton = document.querySelector(".mic-active");
const chatMessages = document.querySelector(".chat-messages");

// Start Listening
function startListening() {
  recognition.start();
  micButton.classList.add("active");
}

// Stop Listening
function stopListening() {
  recognition.stop();
  micButton.classList.remove("active");
}

// Process Recognized Speech
recognition.onresult = async function (event) {
  let transcript = event.results[event.results.length - 1][0].transcript.trim();
  chatMessages.innerHTML += `<br><b>You:</b> ${transcript}`;

  console.log("User said:", transcript);

  try {
    const response = await sendToOpenAI(transcript);
    displayResponse(response);
  } catch (error) {
    console.error("OpenAI API Error:", error);
    displayResponse("⚠ AI is currently unavailable. Please try again later.");
  }
};

async function sendToOpenAI(text) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI Error: ${errorData.error.message}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error in OpenAI API Call:", error);
    return "⚠ AI is facing issues. Please try again later.";
  }
}

function displayResponse(responseText) {
  chatMessages.innerHTML += `<br><b>AI:</b> ${responseText}`;
}
