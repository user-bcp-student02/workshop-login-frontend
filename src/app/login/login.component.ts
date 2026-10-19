import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { userFacingError } from '../utils/user-facing-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username: string | null | undefined = '';
  password: string | null | undefined = '';
  busy = false;
  message = '';

  constructor(
    private router: Router,
    private auth: AuthService,
    readonly session: SessionService,
    private cdr: ChangeDetectorRef
  ) {}

  async login(): Promise<void> {
    this.message = '';
    if (!this.username?.trim()) {
      this.message = 'Ingrese un usuario.';
      return;
    }
    if (!this.password?.trim()) {
      this.message = 'Ingrese una contraseña.';
      return;
    }
    this.busy = true;
    try {
      await this.auth.login(this.username, this.password);
      const navigated = await this.router.navigate(['/dashboard']);
      if (!navigated) {
        throw new Error('Navigation cancelled');
      }
    } catch (error: unknown) {
      this.message = userFacingError(error, 'login');
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }
}
