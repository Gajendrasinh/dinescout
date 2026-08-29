import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatusBadgeComponent] }).compileComponents();
    fixture = TestBed.createComponent(StatusBadgeComponent);
  });

  it('renders the status text', () => {
    fixture.componentInstance.value = 'PUBLISHED';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('PUBLISHED');
  });

  it('applies a positive tone for PUBLISHED and a danger tone for REMOVED', () => {
    fixture.componentInstance.value = 'PUBLISHED';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.badge--positive')).toBeTruthy();

    fixture.componentInstance.value = 'REMOVED';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.badge--danger')).toBeTruthy();
  });

  it('falls back to a neutral tone for an unknown status', () => {
    fixture.componentInstance.value = 'SOMETHING_UNKNOWN';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.badge--neutral')).toBeTruthy();
  });
});
