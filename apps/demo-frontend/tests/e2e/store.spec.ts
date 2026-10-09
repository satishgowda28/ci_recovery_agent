import { expect, test } from '@playwright/test'

test.describe('Engineering Demo Store', () => {
  test('user can add a product to the cart', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()

    await page.getByRole('button', { name: 'Add to cart' }).first().click()

    await expect(page.getByTestId('cart-count')).toHaveText('1')
    await expect(page.getByTestId('cart-total')).toHaveText('$29')
  })

  test('user can complete checkout', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Add to cart' }).first().click()
    await page.getByRole('button', { name: 'Place order' }).click()

    await expect(page.getByRole('status')).toHaveText('Order confirmed')
  })
})
