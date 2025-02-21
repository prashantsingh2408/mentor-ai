// Initialize chat when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const chatMessages = document.querySelector('.chat-messages');
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Voice Recognition
let recognition;
let isListening = false;
let isSpeaking = false;

// Initialize speech synthesis
const speechSynthesis = window.speechSynthesis;
const speechUtterance = new SpeechSynthesisUtterance();
speechUtterance.lang = 'en-US';
speechUtterance.rate = 1.0;
speechUtterance.pitch = 1.0;

function toggleSpeechRecognition(event) {
  const voiceButton = document.querySelector('.voice-button');
  const statusText = document.querySelector('.voice-status-text');
  const speechFeedback = document.getElementById('speechFeedback');
  
  if (!isListening) {
      if (isSpeaking) {
          speechSynthesis.cancel();
      }
      voiceButton.classList.add('listening');
      statusText.textContent = 'Tap to stop';
      speechFeedback.style.display = 'block';
      startListening();
  } else {
      voiceButton.classList.remove('listening');
      statusText.textContent = 'Press to speak';
      speechFeedback.style.display = 'none';
      stopListening();
  }
}

function startListening() {
  try {
      if (!recognition) {
          recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";
          recognition.maxAlternatives = 1;
          
          recognition.onresult = async function(event) {
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
                      await streamFromOpenAI(transcript);
                  } catch (error) {
                      console.error("OpenAI API Error:", error);
                      displayMessage("assistant", "⚠ AI is currently unavailable. Please try again later.");
                  }
              }
          };
      }

      recognition.start();
      isListening = true;
      document.getElementById('overlay').style.display = 'flex';
      document.getElementById('voiceIndicator').style.display = 'flex';
      document.getElementById('micButton').classList.add('active');
  } catch (error) {
      console.error('Speech recognition failed to start:', error);
      alert('Speech recognition is not supported in this browser.');
  }
}

function stopListening() {
  if (recognition) {
      recognition.stop();
  }
  isListening = false;
  const voiceButton = document.querySelector('.voice-button');
  const statusText = document.querySelector('.voice-status-text');
  const speechFeedback = document.getElementById('speechFeedback');
  
  voiceButton.classList.remove('listening');
  statusText.textContent = 'Press to speak';
  speechFeedback.style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('voiceIndicator').style.display = 'none';
}

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
              stream: true
          })
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenAI Error: ${errorData.error.message}`);
      }

      const chatMessages = document.querySelector('.chat-messages');
      const responsePlaceholder = document.createElement('div');
      responsePlaceholder.className = 'message assistant';
      responsePlaceholder.innerHTML = '<b>AI:</b> <span class="content"></span>';
      chatMessages.appendChild(responsePlaceholder);
      const contentSpan = responsePlaceholder.querySelector('.content');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseText = '';

      while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
              if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;

                  try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices[0]?.delta?.content || '';
                      if (content) {
                          responseText += content;
                          contentSpan.textContent = responseText;
                          chatMessages.scrollTop = chatMessages.scrollHeight;
                      }
                  } catch (error) {
                      console.error('Error parsing chunk:', error);
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
  document.querySelector('.chat-messages').appendChild(messageDiv);
  document.querySelector('.chat-messages').scrollTop = document.querySelector('.chat-messages').scrollHeight;
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

// Add this to handle suggestions panel toggle
function toggleSuggestions() {
  const suggestionsPanel = document.getElementById('suggestionsPanel');
  suggestionsPanel.classList.toggle('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  const modeButtons = document.querySelectorAll('.mode-button');
  const chatMessages = document.querySelector('.chat-messages');
  const avatarView = document.getElementById('avatarView');
  
  // Set initial mode
  setMode('chat');

  modeButtons.forEach(button => {
      button.addEventListener('click', () => {
          // Remove active class from all buttons
          modeButtons.forEach(btn => btn.classList.remove('active'));
          // Add active class to clicked button
          button.classList.add('active');
          
          const mode = button.getAttribute('data-mode');
          setMode(mode);
      });
  });

  function setMode(mode) {
      const voiceControls = document.querySelector('.voice-mode-controls');
      const chatInput = document.querySelector('.chat-input');
      const chatMessages = document.querySelector('.chat-messages');
      const avatarView = document.getElementById('avatarView');
      
      // Hide all mode-specific elements first
      voiceControls.classList.add('hidden');
      avatarView.classList.add('hidden');
      chatMessages.classList.remove('hidden');
      chatInput.classList.remove('hidden');

      // Show/hide elements based on mode
      switch(mode) {
          case 'voice':
              voiceControls.classList.remove('hidden');
              chatInput.classList.add('hidden');
              chatMessages.classList.add('pb-32'); // Add padding for voice controls
              break;
          case 'avatar':
              chatMessages.classList.add('hidden');
              chatInput.classList.add('hidden');
              avatarView.classList.remove('hidden');
              break;
          case 'chat':
              chatMessages.classList.remove('pb-32'); // Remove extra padding
              break;
      }

      // Stop listening if switching away from voice mode
      if (mode !== 'voice' && isListening) {
          stopListening();
      }
  }

  // Initialize chat scroll position
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Add event listener for the main voice button
  const mainVoiceButton = document.getElementById('mainVoiceButton');
  if (mainVoiceButton) {
      mainVoiceButton.addEventListener('click', toggleSpeechRecognition);
  }
});
