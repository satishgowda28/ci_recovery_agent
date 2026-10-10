import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('Engineering Demo Store', () => {
  it('adds a product to the cart', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');

    await user.click(screen.getAllByRole('button', { name: 'Add to cart' })[0]);

    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
    expect(screen.getByTestId('cart-total')).toHaveTextContent('$29');
  });

  it('confirms an order after adding a product', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole('button', { name: 'Add to cart' })[0]);
    await user.click(screen.getByRole('button', { name: 'Place order' }));

    expect(screen.getByRole('status')).toHaveTextContent('Order confirmed');
  });
});
