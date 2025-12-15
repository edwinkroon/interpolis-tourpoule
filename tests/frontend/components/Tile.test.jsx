/**
 * Frontend test voor Tile component
 * 
 * Test React component rendering en interactie
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Tile } from '../../../../src/components/Tile';

describe('Tile Component', () => {
  it('should render title', () => {
    render(<Tile title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should render children', () => {
    render(
      <Tile title="Test Title">
        <div>Test Content</div>
      </Tile>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render info icon when info prop is provided', () => {
    const info = {
      title: 'Info Title',
      text: 'Info text'
    };
    render(<Tile title="Test Title" info={info} />);
    
    // Check if info icon button is rendered
    // This depends on how InfoIconButton is implemented
    // You may need to adjust this based on your actual component structure
    const infoButton = screen.queryByLabelText(/info|informatie/i);
    expect(infoButton).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <Tile title="Test Title" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render actions when provided', () => {
    const actions = (
      <button type="button">Action Button</button>
    );
    render(
      <Tile title="Test Title" actions={actions} />
    );
    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });
});

