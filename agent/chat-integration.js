const API_KEY = "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";

class ChatIntegration {
    constructor() {
        this.messageInput = document.querySelector('input[type="text"]');
        this.sendButton = document.querySelector('.fa-paper-plane').parentElement;
        this.chatMessages = document.querySelector('.chat-messages');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        this.sendButton.addEventListener('click', () => this.sendMessage());
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        try {
            // Add user message to chat
            this.addMessageToChat(message, true);
            this.messageInput.value = '';

            // Get AI response
            const response = await this.getAIResponse(message);
            this.addMessageToChat(response, false);
        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessageToChat('Sorry, there was an error processing your message.', false);
        }
    }

    async getAIResponse(message) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a language learning assistant. 
                            If the user speaks in French, respond in French and provide corrections.
                            If the user speaks in English, first respond in English, then provide the French translation.
                            Be friendly and helpful.`
                        },
                        {
                            role: 'user',
                            content: message
                        }
                    ]
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    addMessageToChat(text, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex items-start max-w-3xl ${isUser ? 'ml-auto' : ''}`;
        
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
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Initialize chat integration when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatIntegration = new ChatIntegration();
});
