package domain

import (
	"math/big"
)

// CartItem represents an item in the shopping cart.
type CartItem struct {
	Item    Item
	Quantity int
	InStock  bool
	Total   *big.Float
}

// IsInStock returns whether the item is in stock.
func (c *CartItem) IsInStock() bool {
	return c.InStock
}

// SetInStock sets whether the item is in stock.
func (c *CartItem) SetInStock(inStock bool) {
	c.InStock = inStock
}

// GetTotal returns the total price of the cart item.
func (c *CartItem) GetTotal() *big.Float {
	return c.Total
}

// GetItem returns the item.
func (c *CartItem) GetItem() Item {
	return c.Item
}

// SetItem sets the item and recalculates the total.
func (c *CartItem) SetItem(item Item) {
	c.Item = item
	c.calculateTotal()
}

// GetQuantity returns the quantity of the item.
func (c *CartItem) GetQuantity() int {
	return c.Quantity
}

// SetQuantity sets the quantity and recalculates the total.
func (c *CartItem) SetQuantity(quantity int) {
	c.Quantity = quantity
	c.calculateTotal()
}

// IncrementQuantity increments the quantity and recalculates the total.
func (c *CartItem) IncrementQuantity() {
	c.Quantity++
	c.calculateTotal()
}

// calculateTotal calculates the total price of the cart item.
func (c *CartItem) calculateTotal() {
	if c.Item.ListPrice != nil {
		quantity := new(big.Float).SetInt64(int64(c.Quantity))
		c.Total = new(big.Float).Mul(c.Item.ListPrice, quantity)
	} else {
		c.Total = nil
	}
}