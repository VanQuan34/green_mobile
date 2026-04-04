import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = process.env['NG_APP_API_URL'] || 'https://quantv.store/wp-json/gm/v1';
  private http = inject(HttpClient);
  private router = inject(Router);

  private loggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.loggedInSubject.asObservable();

  constructor() {
    const token = localStorage.getItem('token');
    this.loggedInSubject.next(!!token);
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap(res => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          // localStorage.setItem('user', JSON.stringify(res.user));
          localStorage.setItem('isLoggedIn', 'true');
          this.loggedInSubject.next(true);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.loggedInSubject.next(false);
    this.router.navigate(['/login']);
  }

  get isLoggedIn(): boolean {
    return this.loggedInSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
}
