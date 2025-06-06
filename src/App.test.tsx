import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { RenderResult } from '@testing-library/react';
import App from './App';

describe('App', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = render(<App />);
  });

  it('renders without crashing', () => {
    const element = component.getByText(/home/i);
    expect(element).toBeInTheDocument();
  });
});

export {};
