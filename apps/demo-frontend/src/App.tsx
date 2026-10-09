import { useState } from 'react'

type Product = {
  id: number
  name: string
  price: number
}

const products: Product[] = [
  { id: 1, name: 'Everyday Tee', price: 29 },
  { id: 2, name: 'Canvas Jacket', price: 89 },
  { id: 3, name: 'Travel Sneakers', price: 119 },
]

function App() {
  const [cart, setCart] = useState<Product[]>([])
  const [checkoutComplete, setCheckoutComplete] = useState(false)

  const addToCart = (product: Product) => {
    setCart((current) => [...current, product])
  }

  const total = cart.reduce((sum, product) => sum + product.price, 0)

  const checkout = () => {
    if (cart.length === 0) return
    setCheckoutComplete(true)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI CI Recovery Demo</p>
          <h1>Engineering Demo Store</h1>
        </div>
        <div className="cart-summary" aria-label="Shopping cart">
          Cart <span data-testid="cart-count">{cart.length}</span>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Frontend test target</p>
          <h2>A small app designed to generate realistic CI failures.</h2>
          <p>
            This app is intentionally simple. Playwright, unit tests, linting,
            and TypeScript checks will provide evidence for the AI recovery agent.
          </p>
        </div>
        <div className="hero-card">
          <strong>Current total</strong>
          <span data-testid="cart-total">${total}</span>
        </div>
      </section>

      <section aria-labelledby="products-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2 id="products-heading">Products</h2>
          </div>
          <span>{products.length} products</span>
        </div>

        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-image" aria-hidden="true">
                {product.name.slice(0, 1)}
              </div>
              <div>
                <h3>{product.name}</h3>
                <p>${product.price}</p>
              </div>
              <button type="button" onClick={() => addToCart(product)}>
                Add to cart
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="checkout-panel" aria-labelledby="checkout-heading">
        <div>
          <p className="eyebrow">Checkout</p>
          <h2 id="checkout-heading">Ready to place your order?</h2>
          <p>
            This flow will later be used to reproduce QA reports and Playwright
            failures.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={checkout}
          disabled={cart.length === 0}
        >
          Place order
        </button>

        {checkoutComplete && (
          <p className="success-message" role="status">
            Order confirmed
          </p>
        )}
      </section>
    </main>
  )
}

export default App
