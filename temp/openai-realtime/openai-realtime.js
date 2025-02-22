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

// Silence detection variables
let silenceTimer = null; // Timer to detect silence
const SILENCE_DELAY = 2000; // 2 seconds delay after user stops speaking

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
  speechSynthesis.cancel(); // Stop any ongoing speech
  micButton.classList.remove("active");
  micButton.textContent = "🎤 Start Listening";
  isListening = false;
  isSpeaking = false;
  isProcessing = false; // Reset processing flag
  if (silenceTimer) {
    clearTimeout(silenceTimer); // Clear the silence timer
  }
  console.log("Stopped listening and speaking.");
}

// Updated recognition.onresult with silence detection
recognition.onresult = async function (event) {
  if (isProcessing) return; // Ignore new results while processing the previous one

  // Reset the silence timer whenever new speech input is detected
  if (silenceTimer) {
    clearTimeout(silenceTimer);
  }

  // Get the latest transcript
  const result = event.results[event.results.length - 1];
  const transcript = result[0].transcript.trim().toLowerCase();

  // Ignore interim results (partial speech)
  if (result.isFinal) {
    console.log("User said:", transcript);

    // Start a new timer to wait for 2 seconds after the user stops speaking
    silenceTimer = setTimeout(async () => {
      isProcessing = true; // Set processing flag

      if (transcript) {
        displayMessage("user", transcript);

        // Stop listening if the user says "stop"
        if (transcript === "stop listening") {
          displayMessage("assistant", "Listening stopped.");
          stopListening(); // Stop everything
          return;
        }

        // Only process if the user said something meaningful
        if (transcript.trim().length > 0) {
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
      }
    }, SILENCE_DELAY);
  }
};

async function streamFromOpenAI(text) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer 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`, // Replace with your OpenAI API key
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
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      buffer += chunk;

      // Process each line in the buffer
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Save the last incomplete line back to the buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || "";
            if (content) {
              contentSpan.textContent += content;
              chatMessages.scrollTop = chatMessages.scrollHeight;
            }
          } catch (error) {
            console.error("Error parsing chunk:", error);
          }
        }
      }
    }

    // Speak the response
    speakText(contentSpan.textContent);
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
