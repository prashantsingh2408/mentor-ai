// Initialize chat when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const chatMessages = document.querySelector('.chat-messages');
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Initialize speech recognition
  initializeSpeechRecognition();

  // Set up mic button click handler
  const micButton = document.getElementById('micButton');
  if (micButton) {
    // Remove any existing listeners first
    micButton.removeEventListener('click', handleMicClick);
    // Add the click handler
    micButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleMicClick(e);
    });
  }
});

// Speech Recognition Setup
let recognition = null;
let isListening = false;
let isSpeaking = false;

// Initialize speech synthesis
const speechSynthesis = window.speechSynthesis;
const speechUtterance = new SpeechSynthesisUtterance();
speechUtterance.lang = 'en-US';
speechUtterance.rate = 1.0;
speechUtterance.pitch = 1.0;

function initializeSpeechRecognition() {
    try {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        
        recognition.onresult = handleSpeechResult;
        recognition.onerror = handleSpeechError;
        recognition.onend = handleSpeechEnd;
        
        console.log('Speech recognition initialized');
    } catch (error) {
        console.error('Speech recognition failed to initialize:', error);
    }
}

function handleMicClick(event) {
    event.preventDefault();
    const micButton = event.currentTarget;
    const micWaves = micButton.parentElement.querySelector('.mic-waves');
    
    console.log('Mic clicked, current state:', isListening);
    
    if (!recognition) {
        initializeSpeechRecognition();
    }
    
    if (!isListening) {
        startListening();
        micButton.classList.add('listening');
        micWaves.classList.remove('hidden');
    } else {
        stopListening();
        micButton.classList.remove('listening');
        micWaves.classList.add('hidden');
    }
}

function startListening() {
    try {
        recognition.start();
        isListening = true;
        updateUIForListening(true);
        console.log('Started listening');
    } catch (error) {
        console.error('Failed to start listening:', error);
        alert('Speech recognition failed to start. Please try again.');
        stopListening();
    }
}

function stopListening() {
    if (recognition) {
        recognition.stop();
    }
    isListening = false;
    updateUIForListening(false);
    console.log('Stopped listening');
}

function updateUIForListening(isActive) {
    const micButton = document.getElementById('micButton');
    const micWaves = micButton?.parentElement.querySelector('.mic-waves');
    const speechFeedback = document.getElementById('speechFeedback');
    
    if (isActive) {
        micButton?.classList.add('listening');
        micWaves?.classList.remove('hidden');
        if (speechFeedback) speechFeedback.style.display = 'flex';
    } else {
        micButton?.classList.remove('listening');
        micWaves?.classList.add('hidden');
        if (speechFeedback) speechFeedback.style.display = 'none';
    }
}

async function handleSpeechResult(event) {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    console.log('Speech recognized:', transcript);

    if (transcript) {
        displayMessage("user", transcript);

        if (transcript.toLowerCase() === "stop") {
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
}

// IBM models
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

function handleSpeechError(event) {
    console.error('Speech recognition error:', event.error);
    stopListening();
}

function handleSpeechEnd() {
    if (isListening) {
        try {
            recognition.start();
        } catch (error) {
            console.error('Failed to restart recognition:', error);
            stopListening();
        }
    }
}

// async function streamFromOpenAI(text) {
//   try {
//       const response = await fetch("https://api.openai.com/v1/chat/completions", {
//           method: "POST",
//           headers: {
//               "Content-Type": "application/json",
//               Authorization: `Bearer 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`,
//           },
//           body: JSON.stringify({
//               model: "gpt-3.5-turbo",
//               messages: [{ role: "user", content: text }],
//               stream: true
//           })
//       });

//       if (!response.ok) {
//           const errorData = await response.json();
//           throw new Error(`OpenAI Error: ${errorData.error.message}`);
//       }

//       const chatMessages = document.querySelector('.chat-messages');
//       const responsePlaceholder = document.createElement('div');
//       responsePlaceholder.className = 'message assistant';
//       responsePlaceholder.innerHTML = '<b>AI:</b> <span class="content"></span>';
//       chatMessages.appendChild(responsePlaceholder);
//       const contentSpan = responsePlaceholder.querySelector('.content');

//       const reader = response.body.getReader();
//       const decoder = new TextDecoder();
//       let responseText = '';

//       while (true) {
//           const { done, value } = await reader.read();
//           if (done) break;

//           const chunk = decoder.decode(value);
//           const lines = chunk.split('\n').filter(line => line.trim());

//           for (const line of lines) {
//               if (line.startsWith('data: ')) {
//                   const data = line.slice(6);
//                   if (data === '[DONE]') continue;

//                   try {
//                       const parsed = JSON.parse(data);
//                       const content = parsed.choices[0]?.delta?.content || '';
//                       if (content) {
//                           responseText += content;
//                           contentSpan.textContent = responseText;
//                           chatMessages.scrollTop = chatMessages.scrollHeight;
//                       }
//                   } catch (error) {
//                       console.error('Error parsing chunk:', error);
//                   }
//               }
//           }
//       }

//       // Speak the response
//       speakText(responseText);

//   } catch (error) {
//       console.error("Streaming Error:", error);
//       displayMessage("assistant", "⚠ Error in AI response. Please try again.");
//   }
// }

function speakText(text) {
  speechSynthesis.cancel();
  speechUtterance.text = text;
  isSpeaking = true;
  speechSynthesis.speak(speechUtterance);
  
  speechUtterance.onend = () => {
      isSpeaking = false;
      console.log('Finished speaking');
  };
  
  speechUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      isSpeaking = false;
  };
}

function displayMessage(role, text) {
    const chatMessages = document.querySelector('.chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex items-start max-w-3xl ${role === 'user' ? 'ml-auto' : ''}`;
    
    const content = `
        ${role === 'user' ? `
            <div class="mr-3 bg-primary-100 rounded-lg p-4">
                <p class="text-gray-800">${text}</p>
            </div>
            <div class="flex-shrink-0">
                <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <i class="fas fa-user text-gray-600"></i>
                </div>
            </div>
        ` : `
            <div class="flex-shrink-0">
                <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <i class="fas fa-language text-primary-600"></i>
                </div>
            </div>
            <div class="ml-3 bg-gray-100 rounded-lg p-4">
                <p class="text-gray-800">${text}</p>
            </div>
        `}
    `;
    
    messageDiv.innerHTML = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Initialize voice selection
window.addEventListener('DOMContentLoaded', () => {
  speechSynthesis.onvoiceschanged = () => {
      const voices = speechSynthesis.getVoices();
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

// Update the toggleSuggestions function
function toggleSuggestions() {
    const panel = document.getElementById('suggestionsPanel');
    const mainContent = document.querySelector('.main-content');
    const isCollapsed = panel.classList.contains('translate-x-full');
    
    if (isCollapsed) {
        // Expand
        panel.classList.remove('translate-x-full');
        panel.classList.add('translate-x-0');
        mainContent?.classList.add('panel-expanded');
    } else {
        // Collapse
        panel.classList.remove('translate-x-0');
        panel.classList.add('translate-x-full');
        mainContent?.classList.remove('panel-expanded');
    }
}

// Initialize panel state on load
document.addEventListener('DOMContentLoaded', () => {
    const panel = document.getElementById('suggestionsPanel');
    if (panel) {
        panel.classList.add('translate-x-full');
    }
});

function toggleAvatarMode() {
    const chatInput = document.querySelector('.chat-input');
    const chatMessages = document.querySelector('.chat-messages');
    const avatarView = document.getElementById('avatarView');
    const avatarButton = document.getElementById('avatarButton');
    
    if (avatarView.classList.contains('hidden')) {
        // Switch to avatar mode
        chatMessages.classList.add('hidden');
        chatInput.classList.add('hidden');
        avatarView.classList.remove('hidden');
        avatarButton.classList.add('active');
        // Stop listening if active
        if (isListening) {
            stopListening();
        }
    } else {
        // Switch back to chat mode
        chatMessages.classList.remove('hidden');
        chatInput.classList.remove('hidden');
        avatarView.classList.add('hidden');
        avatarButton.classList.remove('active');
    }
}
