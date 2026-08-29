import { Injectable, inject } from '@angular/core';
import { AiChatRequest, AiChatResponse, AiConversation } from '@dinescout/shared-types';
import { Observable } from 'rxjs';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly api = inject(ApiClientService);

  chat(request: AiChatRequest): Observable<AiChatResponse> {
    return this.api.post<AiChatResponse>('/ai/chat', request);
  }

  listConversations(): Observable<AiConversation[]> {
    return this.api.get<AiConversation[]>('/ai/conversations');
  }

  getConversation(id: string): Observable<AiConversation> {
    return this.api.get<AiConversation>(`/ai/conversations/${id}`);
  }
}
