import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TestService {
  private http = inject(HttpClient);


  private baseUrl = environment.apiUrl;

  getMessageTest(): Observable<string> {
    return this.http.get(this.baseUrl, { responseType: 'text' });
  }
}
