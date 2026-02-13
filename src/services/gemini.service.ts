import { Injectable } from '@angular/core';

// This service is deprecated in favor of LocalConverterService for offline usage.
// We keep the file to prevent file-not-found errors during any potential build caching,
// but remove the imports to @google/genai to prevent runtime crashes.

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  constructor() {}

  async convertDocument(base64Data: string, mimeType: string, targetFormat: string): Promise<string> {
    return "Error: Online conversion is disabled. Please use Local Mode.";
  }
}