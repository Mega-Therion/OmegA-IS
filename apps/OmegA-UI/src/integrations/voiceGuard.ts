// OMEGAI Voice Guard - Optional backend verification layer
// This is a thin wrapper for future server-side voice processing

export interface VoiceVerificationRequest {
  transcript: string;
  fingerprint: string;
  userId?: string;
}

export interface VoiceVerificationResponse {
  verified: boolean;
  confidence: number;
  message?: string;
}

/**
 * Client-side verification wrapper
 * Can be swapped with a backend API call for advanced voice-print analysis
 */
export async function verifyVoiceGuard(
  request: VoiceVerificationRequest
): Promise<VoiceVerificationResponse> {
  // For now, this is a pass-through to the client-side verification
  // In the future, you could send this to a backend endpoint:
  //
  // const response = await fetch('/api/voice/verify', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(request),
  // });
  //
  // return response.json();

  // Placeholder: Return a mock response for now
  return {
    verified: false,
    confidence: 0,
    message: 'Client-side verification only. Backend guard not implemented.',
  };
}

/**
 * Record a voice fingerprint (future: send to backend for storage)
 */
export async function recordVoiceFingerprint(
  passPhrase: string,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  // Future: Send to backend
  // const response = await fetch('/api/voice/fingerprint', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ passPhrase, userId }),
  // });
  //
  // return response.json();

  return {
    success: true,
    message: 'Fingerprint stored locally only',
  };
}

/**
 * Delete a voice fingerprint
 */
export async function deleteVoiceFingerprint(
  userId: string
): Promise<{ success: boolean }> {
  // Future: Send to backend
  return { success: true };
}

/**
 * Generic chatbot endpoint (fallback when voice auth fails)
 */
export async function sendToChatbot(message: string): Promise<string> {
  // This could be a separate chatbot endpoint that doesn't have access
  // to sensitive commands or data
  //
  // const response = await fetch('/api/chatbot/generic', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ message }),
  // });
  //
  // const data = await response.json();
  // return data.response;

  return `[Generic Chatbot]: I received your message "${message}", but I don't have voice authorization to execute commands. Please authenticate with your voice first.`;
}
