import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private users: Array<{ correo: string, pass: string }> = [];

  constructor() { }

  registrar(correo: string, pass: string): boolean {
    const existe = this.users.find(u => u.correo === correo);
    if (existe) {
      return false;
    }
    this.users.push({ correo, pass });
    return true;
  }

  login(correo: string, pass: string): boolean {
    const user = this.users.find(u => u.correo === correo && u.pass === pass);
    return !!user;
  }
}
