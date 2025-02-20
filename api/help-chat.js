const API_KEY = "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";

class ChatAPI {
    constructor() {
        this.systemPrompt = '';
    }

    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
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
                            content: this.systemPrompt || `You are a language learning assistant. 
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
}

// Export the ChatAPI class
export default ChatAPI; 