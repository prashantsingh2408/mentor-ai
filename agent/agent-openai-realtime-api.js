const recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;
  
  // Initialize speech synthesis
  const speechSynthesis = window.speechSynthesis;
  const speechUtterance = new SpeechSynthesisUtterance();
  speechUtterance.lang = 'en-US';
  speechUtterance.rate = 1.0;
  speechUtterance.pitch = 1.0;
  
  const micButton = document.querySelector(".mic-button");
  const chatMessages = document.querySelector(".chat-messages");
  let isListening = false;
  let isSpeaking = false;
  
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
    const transcript = event.results[event.results.length - 1][0].transcript
      .trim()
      .toLowerCase();
    console.log("User said:", transcript);
  
    if (transcript) {
      displayMessage("user", transcript);
  
      if (transcript === "stop") {
        displayMessage("assistant", "Listening stopped.");
        stopListening();
        return;
      }
  
      try {
        await graniteQuery(transcript);
      } catch (error) {
        console.error("OpenAI API Error:", error);
        displayMessage("assistant", "⚠ AI is currently unavailable. Please try again later.");
      }
    }
  };

  //   IBM model 
  // get ibm t
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
      const url = "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29";
      const headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      };
      const payload = {
          "input": `<|start_of_role|>system<|end_of_role|>PROMPT<|end_of_text|>\n`
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

  // async function streamFromOpenAI(text) {
  //   try {
  //     const response = await fetch("https://api.openai.com/v1/chat/completions", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer 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`,
  //       },
  //       body: JSON.stringify({
  //         model: "gpt-3.5-turbo",
  //         messages: [{ role: "user", content: text }],
  //         stream: true
  //       })
  //     });
  
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(`OpenAI Error: ${errorData.error.message}`);
  //     }
  
  //     // Create placeholder for streaming response
  //     const responsePlaceholder = document.createElement('div');
  //     responsePlaceholder.className = 'message assistant';
  //     responsePlaceholder.innerHTML = '<b>AI:</b> <span class="content"></span>';
  //     chatMessages.appendChild(responsePlaceholder);
  //     const contentSpan = responsePlaceholder.querySelector('.content');
  
  //     const reader = response.body.getReader();
  //     const decoder = new TextDecoder();
  //     let responseText = '';
  
  //     while (true) {
  //       const { done, value } = await reader.read();
  //       if (done) break;
  
  //       const chunk = decoder.decode(value);
  //       const lines = chunk.split('\n').filter(line => line.trim());
  
  //       for (const line of lines) {
  //         if (line.startsWith('data: ')) {
  //           const data = line.slice(6);
  //           if (data === '[DONE]') continue;
  
  //           try {
  //             const parsed = JSON.parse(data);
  //             const content = parsed.choices[0]?.delta?.content || '';
  //             if (content) {
  //               responseText += content;
  //               contentSpan.textContent = responseText;
  //               chatMessages.scrollTop = chatMessages.scrollHeight;
  //             }
  //           } catch (error) {
  //             console.error('Error parsing chunk:', error);
  //           }
  //         }
  //       }
  //     }
  
  //     // Speak the response
  //     speakText(responseText);
  
  //   } catch (error) {
  //     console.error("Streaming Error:", error);
  //     displayMessage("assistant", "⚠ Error in AI response. Please try again.");
  //   }
  // }
  
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
      console.log('Finished speaking');
    };
    
    // Handle speech error
    speechUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      isSpeaking = false;
    };
  }
  
  function displayMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = `<b>${role === 'user' ? 'You' : 'AI'}:</b> ${text}`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  recognition.onerror = function(event) {
    console.error('Speech Recognition Error:', event.error);
    displayMessage("assistant", `⚠ Speech recognition error: ${event.error}`);
    stopListening();
  };
  
  recognition.onend = function() {
    console.log('Speech recognition service disconnected');
    if (isListening) {
      console.log('Attempting to restart recognition');
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
  
  recognition.onstart = function() {
    console.log('Speech recognition service has started');
  };
  
  // Initialize voice selection
  window.addEventListener('DOMContentLoaded', () => {
    // Wait for voices to be loaded
    speechSynthesis.onvoiceschanged = () => {
      const voices = speechSynthesis.getVoices();
      // Try to find a natural-sounding English voice
      const preferredVoice = voices.find(voice => 
        voice.lang.includes('en') && 
        (voice.name.includes('Natural') || voice.name.includes('Premium'))
      ) || voices.find(voice => voice.lang.includes('en'));
      
      if (preferredVoice) {
        speechUtterance.voice = preferredVoice;
        console.log('Selected voice:', preferredVoice.name);
      }
    };
  }); 