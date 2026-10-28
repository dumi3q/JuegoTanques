import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalaEsperaComponent } from './sala-espera.component';

describe('SalaEsperaComponent', () => {
  let component: SalaEsperaComponent;
  let fixture: ComponentFixture<SalaEsperaComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SalaEsperaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
