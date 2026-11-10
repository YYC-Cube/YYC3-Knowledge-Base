import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// 最简单的测试组件
const TestComponent = () => <div data-testid="test-component">Hello World</div>;

describe('Basic Test', () => {
  it('should render a simple component', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('test-component')).toBeInTheDocument();
  });
});