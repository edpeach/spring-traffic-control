import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMarkdown } from 'ngx-markdown';
import { AgentDrawer } from './agent-drawer';

describe('AgentDrawer', () => {
  let component: AgentDrawer;
  let fixture: ComponentFixture<AgentDrawer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentDrawer],
      providers: [provideRouter([]), provideMarkdown()],
    }).compileComponents();

    fixture = TestBed.createComponent(AgentDrawer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
