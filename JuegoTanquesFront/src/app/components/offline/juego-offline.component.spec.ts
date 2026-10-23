import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JuegoOfflineComponent } from './offline.component';

describe('JuegoOfflineComponent', () => {
  let component: JuegoOfflineComponent;
  let fixture: ComponentFixture<JuegoOfflineComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(JuegoOfflineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
