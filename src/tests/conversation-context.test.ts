import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeClient } from '../services/ai/claude-client.js';

describe('Conversation Context', () => {
  let claudeClient: ClaudeClient;

  beforeEach(() => {
    claudeClient = new ClaudeClient();
  });

  it('should maintain context across multiple messages', async () => {
    // Simulate a conversation about flight booking
    const chatHistory = [
      {
        text: 'Can I get a flight from Seattle to Alaska Sept 21 to 29?',
        sender: 'user' as const,
      },
      {
        text: "I'll help you search for flights from Seattle to Alaska. However, I'll need to know which city in Alaska you'd like to fly to, as Alaska has several major airports...",
        sender: 'bot' as const,
      },
    ];

    // The user responds with just "Anchorage please"
    const response = await claudeClient.processMessage(
      'Anchorage please',
      chatHistory
    );

    // The AI should remember the original request and have the flight search information
    expect(response.text).toMatch(/seattle/i);
    expect(response.text).toMatch(/anchorage/i);
    expect(response.text).toMatch(/september/i);

    // Should indicate it's processing the flight search or call the search tool
    expect(response.toolCalls.length).toBeGreaterThan(0);

    const searchTool = response.toolCalls.find(
      (tool) => tool.name === 'search_flights'
    );
    expect(searchTool).toBeDefined();
    expect(searchTool?.arguments.origin).toBe('SEA');
    expect(searchTool?.arguments.destination).toBe('ANC');
    expect(searchTool?.arguments.departure_date).toBe('2024-09-21'); // Assuming 2024
  });

  it('should remember previous context when asking follow-up questions', async () => {
    const chatHistory = [
      { text: 'I need a hotel in Paris for 2 nights', sender: 'user' as const },
      {
        text: "I'd be happy to help you find a hotel in Paris! To search for the best options, I'll need a few more details...",
        sender: 'bot' as const,
      },
    ];

    const response = await claudeClient.processMessage(
      'Next weekend',
      chatHistory
    );

    // Should reference the previous hotel request
    expect(response.text).toMatch(/hotel/i);
    expect(response.text).toMatch(/paris/i);
    expect(response.text).toMatch(/2 nights/i);
  });
});
