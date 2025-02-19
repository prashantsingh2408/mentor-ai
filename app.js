// Toggle suggestions panel visibility
function toggleSuggestions() {
    const panel = document.getElementById('suggestionsPanel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        panel.classList.add('fixed', 'inset-0', 'z-50');
    } else {
        panel.classList.remove('fixed', 'inset-0', 'z-50');
    }
}

// Auto-scroll to bottom when new messages are added
const chatMessages = document.querySelector('.chat-messages');
chatMessages.scrollTop = chatMessages.scrollHeight;

// Handle message input
const messageInput = document.querySelector('input[type="text"]');
const sendButton = document.querySelector('.fa-paper-plane').parentElement;

// Speech recognition integration with AI API
let recognition;
let isListening = false;

// Add at the beginning of the file
let currentMode = 'chat';

// Add this function
function switchMode(mode) {
    const modeButtons = document.querySelectorAll('.mode-button');
    const micButton = document.getElementById('micButton');
    const mainContent = document.querySelector('.mobile-chat-container');
    const avatarView = document.getElementById('avatarView');
    
    // Update buttons
    modeButtons.forEach(button => {
        if(button.dataset.mode === mode) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    // Update UI based on mode
    switch(mode) {
        case 'chat':
            micButton.style.display = 'none';
            mainContent.classList.remove('hidden');
            avatarView.classList.add('hidden');
            if(isListening) stopListening();
            break;
        case 'voice':
            micButton.style.display = 'block';
            mainContent.classList.remove('hidden');
            avatarView.classList.add('hidden');
            break;
        case 'avatar':
            micButton.style.display = 'none';
            mainContent.classList.add('hidden');
            avatarView.classList.remove('hidden');
            break;
    }

    currentMode = mode;
}

// Add event listeners for mode buttons
document.addEventListener('DOMContentLoaded', () => {
    const modeButtons = document.querySelectorAll('.mode-button');
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchMode(button.dataset.mode);
        });
    });

    // Initialize with chat mode
    switchMode('chat');

    const startAvatarButton = document.getElementById('startAvatarButton');
    if (startAvatarButton) {
        startAvatarButton.addEventListener('click', () => {
            if (!isListening) {
                startAvatarButton.classList.add('recording');
                startAvatarButton.innerHTML = '<i class="fas fa-stop"></i> Stop Speaking';
                startSpeechRecognition();
            } else {
                startAvatarButton.classList.remove('recording');
                startAvatarButton.innerHTML = '<i class="fas fa-microphone"></i> Start Speaking';
                stopListening();
            }
        });
    }
});

async function processAudioStream(audioChunk) {
    try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer YOUR_API_KEY',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audio: audioChunk,
                model: "whisper-1",
                language: "fr"
            })
        });

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error('Error processing audio:', error);
        return null;
    }
}

// Modify the existing getAIResponse function to handle different modes
async function getAIResponse(text, mode = currentMode) {
    try {
        const systemPrompt = mode === 'avatar' 
            ? "You are a friendly AI language tutor with an avatar. Respond in French, provide corrections, and describe your avatar's expressions and gestures in [brackets]."
            : "You are a French language tutor. Respond in French and provide corrections and suggestions for improvement.";

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer YOUR_API_KEY',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: text
                    }
                ]
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error getting AI response:', error);
        return null;
    }
}

// Modify addMessageToChat to handle avatar mode
function addMessageToChat(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex items-start max-w-3xl ${isUser ? 'ml-auto' : ''}`;
    
    if (currentMode === 'avatar' && !isUser) {
        // Extract avatar actions from text (if any)
        const actions = text.match(/\[.*?\]/g) || [];
        const cleanText = text.replace(/\[.*?\]/g, '').trim();
        
        const messageHTML = `
            <div class="flex-shrink-0">
                <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <i class="fas fa-user-circle text-primary-600"></i>
                </div>
            </div>
            <div class="ml-3 bg-gray-100 rounded-lg p-4">
                <p class="text-gray-800">${cleanText}</p>
                ${actions.length > 0 ? `
                    <div class="mt-2 text-sm text-gray-500">
                        ${actions.join(' ')}
                    </div>
                ` : ''}
            </div>
        `;
        messageDiv.innerHTML = messageHTML;
    } else {
        // Original message format
        const messageHTML = `
            ${isUser ? `
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
        messageDiv.innerHTML = messageHTML;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function toggleSpeechRecognition(event) {
    event.stopPropagation();
    
    const micButton = document.getElementById('micButton');
    const overlay = document.getElementById('overlay');
    const voiceIndicator = document.getElementById('voiceIndicator');
    
    if (isListening) {
        stopListening();
    } else {
        micButton.classList.add('bg-red-600');
        micButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // Show appropriate UI based on mode
        if (currentMode === 'avatar') {
            // Don't show any indicator for avatar mode yet
        } else if (currentMode === 'voice') {
            voiceIndicator.style.display = 'block';
        } else {
            overlay.style.display = 'flex';
        }
        
        startSpeechRecognition();
    }
}

async function startSpeechRecognition() {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;

    recognition.onstart = () => {
        isListening = true;
    };

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        messageInput.value = transcript;
        
        // Animate voice waves based on speech volume
        if (event.results[0].isFinal) {
            const waves = document.querySelectorAll('.voice-wave');
            waves.forEach(wave => {
                wave.style.animation = 'none';
                wave.offsetHeight; // Trigger reflow
                wave.style.animation = null;
            });
        }
        
        addMessageToChat(transcript, true);

        const aiResponse = await getAIResponse(transcript);
        if (aiResponse) {
            addMessageToChat(aiResponse, false);
        }
    };

    recognition.onend = () => {
        const micButton = document.getElementById('micButton');
        micButton.classList.remove('bg-red-600');
        micButton.innerHTML = '<i class="fas fa-microphone"></i>';
        overlay.style.display = 'none';
        isListening = false;
    };

    recognition.start();
}

async function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        addMessageToChat(message, true);

        const aiResponse = await getAIResponse(message);
        if (aiResponse) {
            addMessageToChat(aiResponse, false);
        }

        messageInput.value = '';
    }
}

function stopListening() {
    if (isListening && recognition) {
        recognition.stop();
        const micButton = document.getElementById('micButton');
        const overlay = document.getElementById('overlay');
        const voiceIndicator = document.getElementById('voiceIndicator');
        
        micButton.classList.remove('bg-red-600');
        micButton.innerHTML = '<i class="fas fa-microphone"></i>';
        overlay.style.display = 'none';
        voiceIndicator.style.display = 'none';
        isListening = false;
    }
}

// Event Listeners
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

sendButton.addEventListener('click', sendMessage); 