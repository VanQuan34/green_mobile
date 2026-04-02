import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.loggedInSubject.asObservable();

  constructor(private router: Router) {
    const isLogged = localStorage.getItem('isLoggedIn') === 'true';
    this.loggedInSubject.next(isLogged);
  }

  login(password: string): boolean {
    // Demo: Fixed password for Di Động Xanh
    if (password === 'admin123' || password === 'green_shop') {
      localStorage.setItem('isLoggedIn', 'true');
      this.loggedInSubject.next(true);
      return true;
    }
    return false;
  }

  logout() {
    localStorage.removeItem('isLoggedIn');
    this.loggedInSubject.next(false);
    this.router.navigate(['/login']);
  }

  get isLoggedIn(): boolean {
    return this.loggedInSubject.value;
  }
}
