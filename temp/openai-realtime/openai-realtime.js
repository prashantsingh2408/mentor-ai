const recognition = new (window.SpeechRecognition ||
  window.webkitSpeechRecognition)();
recognition.continuous = true; // Keep listening after each result
recognition.interimResults = true; // Allow interim results
recognition.lang = "en-US"; // Set language
recognition.maxAlternatives = 1; // Only one alternative result

// Initialize speech synthesis
const speechSynthesis = window.speechSynthesis;
const speechUtterance = new SpeechSynthesisUtterance();
speechUtterance.lang = "en-US";
speechUtterance.rate = 1.0;
speechUtterance.pitch = 1.0;

const micButton = document.querySelector(".mic-button");
const chatMessages = document.querySelector(".chat-messages");
let isListening = false;
let isSpeaking = false;
let isProcessing = false; // Flag to prevent overlapping processing

// Stop speaking when mic is activated
micButton.addEventListener("click", () => {
  if (isListening) {
    stopListening();
  } else {
    if (isSpeaking) {
      speechSynthesis.cancel();
    }
    startListening();
  }
});

function startListening() {
  try {
    recognition.start();
    micButton.classList.add("active");
    micButton.textContent = "⏹ Stop Listening";
    isListening = true;
    console.log("Started listening...");
  } catch (error) {
    console.error("Error starting recognition:", error);
    displayResponse("⚠ Could not start speech recognition. Please try again.");
  }
}

function stopListening() {
  recognition.stop();
  micButton.classList.remove("active");
  micButton.textContent = "🎤 Start Listening";
  isListening = false;
}

recognition.onresult = async function (event) {
  if (isProcessing) return; // Ignore new results while processing the previous one
  isProcessing = true; // Set processing flag

  const transcript = event.results[event.results.length - 1][0].transcript
    .trim()
    .toLowerCase();
  console.log("User said:", transcript);

  if (transcript) {
    displayMessage("user", transcript);

    if (transcript === "stop") {
      displayMessage("assistant", "Listening stopped.");
      stopListening();
      isProcessing = false; // Reset processing flag
      return;
    }

    try {
      await streamFromOpenAI(transcript);
    } catch (error) {
      console.error("OpenAI API Error:", error);
      displayMessage(
        "assistant",
        "⚠ AI is currently unavailable. Please try again later."
      );
    } finally {
      isProcessing = false; // Reset processing flag
    }
  }
};

async function streamFromOpenAI(text) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer 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`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: text }],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI Error: ${errorData.error.message}`);
    }

    // Create placeholder for streaming response
    const responsePlaceholder = document.createElement("div");
    responsePlaceholder.className = "message assistant";
    responsePlaceholder.innerHTML = '<b>AI:</b> <span class="content"></span>';
    chatMessages.appendChild(responsePlaceholder);
    const contentSpan = responsePlaceholder.querySelector(".content");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || "";
            if (content) {
              responseText += content;
              contentSpan.textContent = responseText;
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          } catch (error) {
            console.error("Error parsing chunk:", error);
          }
        }
      }
    }

    // Speak the response
    speakText(responseText);
  } catch (error) {
    console.error("Streaming Error:", error);
    displayMessage("assistant", "⚠ Error in AI response. Please try again.");
  }
}

function speakText(text) {
  // Stop any ongoing speech
  speechSynthesis.cancel();

  // Set the text to be spoken
  speechUtterance.text = text;

  // Start speaking
  isSpeaking = true;
  speechSynthesis.speak(speechUtterance);

  // Handle speech end
  speechUtterance.onend = () => {
    isSpeaking = false;
    console.log("Finished speaking");
  };

  // Handle speech error
  speechUtterance.onerror = (event) => {
    console.error("Speech synthesis error:", event);
    isSpeaking = false;
  };
}

function displayMessage(role, text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;
  messageDiv.innerHTML = `<b>${role === "user" ? "You" : "AI"}:</b> ${text}`;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

recognition.onerror = function (event) {
  console.error("Speech Recognition Error:", event.error);
  displayMessage("assistant", `⚠ Speech recognition error: ${event.error}`);
  stopListening();
};

recognition.onend = function () {
  console.log("Speech recognition service disconnected");
  if (isListening) {
    console.log("Attempting to restart recognition");
    setTimeout(() => {
      try {
        recognition.start();
      } catch (error) {
        console.error("Error restarting recognition:", error);
        stopListening();
      }
    }, 1000);
  }
};

recognition.onstart = function () {
  console.log("Speech recognition service has started");
};

// Initialize voice selection
window.addEventListener("DOMContentLoaded", () => {
  // Wait for voices to be loaded
  speechSynthesis.onvoiceschanged = () => {
    const voices = speechSynthesis.getVoices();
    // Try to find a natural-sounding English voice
    const preferredVoice =
      voices.find(
        (voice) =>
          voice.lang.includes("en") &&
          (voice.name.includes("Natural") || voice.name.includes("Premium"))
      ) || voices.find((voice) => voice.lang.includes("en"));

    if (preferredVoice) {
      speechUtterance.voice = preferredVoice;
      console.log("Selected voice:", preferredVoice.name);
    }
  };
});
